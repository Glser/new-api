"""Remove Canvas 480p using configuration APIs; preserve live channel/groups.

Run on the server as root after offline fixture verification. No upstream calls.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlencode
import urllib.request

sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows, save_json

PREVIOUS_HASH = "63fcb8ceb8a83c66e79622c74fa3ba690ec4518bc7ced043bfc2eb20fb664b32"
MODELS = ["seedance-2.5", "sd2.5-qd"]
OLD_EXPR = ('u("resolution") == "480p" ? tier("480p", u("seconds") * 0.67) : '
            'u("resolution") == "720p" ? tier("720p", u("seconds") * 1.51) : '
            'tier("1080p", u("seconds") * 3.74)')
NEW_EXPR = ('u("resolution") == "720p" ? tier("720p", u("seconds") * 1.51) : '
            'tier("1080p", u("seconds") * 3.74)')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    staged = Path(__file__).resolve().parent
    source = (staged / "plugin.js").read_text(encoding="utf-8")
    source_hash = hashlib.sha256(source.encode()).hexdigest()
    admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]

    def api(path, method="GET", body=None):
        allowed = ("/api/option/", "/api/plugin/task", "/api/channel/")
        if not path.startswith(allowed) or any(part in path for part in ("/test", "/fetch_models", "/update_balance", "/upstream_updates", "/dry-run")):
            raise ValueError("only configuration management operations are allowed")
        payload = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        req = urllib.request.Request("http://127.0.0.1:3000" + path, data=payload, method=method,
            headers={"Authorization": "Bearer " + admin["access_token"].strip(),
                     "New-Api-User": str(admin["id"]), "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
        if not result.get("success"):
            raise RuntimeError("configuration operation failed at " + path + ": " + str(result.get("message", "")))
        return result.get("data")

    def options():
        return {entry["key"]: entry["value"] for entry in api("/api/option/")}

    def pricing():
        return api("/api/option/model_pricing?" + urlencode([("model", name) for name in MODELS]))

    def container():
        result = subprocess.run(["docker", "inspect", "newapi"], text=True, capture_output=True, check=True)
        entry = json.loads(result.stdout)[0]
        return {"image": entry["Image"], "started_at": entry["State"]["StartedAt"],
                "status": entry["State"]["Status"], "health": entry["State"].get("Health", {}).get("Status")}

    before_channel = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")[0]
    before_plugins = rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    active = next(p for p in before_plugins if p["active"])
    if active["source_hash"] != PREVIOUS_HASH or not active["enabled"]:
        raise RuntimeError("active Canvas plugin changed; review before updating")
    if before_channel["type"] != 61 or json.loads(before_channel["setting"])["task_plugin_key"] != "canvas":
        raise RuntimeError("channel 79 binding changed; review before updating")
    before_options = options()
    before_pricing = pricing()
    expected_old = {"billing_setting.billing_mode": "tiered_expr", "billing_setting.billing_expr": OLD_EXPR}
    draft = {"billing_setting.billing_mode": "tiered_expr", "billing_setting.billing_expr": NEW_EXPR}
    if any(entry["configured"] != expected_old for entry in before_pricing["entries"]):
        raise RuntimeError("existing model prices changed; review before updating")
    before_container = container()
    tasks_before = rows("SELECT row_to_json(t) FROM (SELECT count(*) AS count FROM tasks WHERE platform='canvas') t")[0]["count"]
    plan = {"channel_id": 79, "preserved_channel_status": before_channel["status"],
            "preserved_group_ratio": json.loads(before_options["GroupRatio"])["Seedance-QT"],
            "resolutions": ["720p", "1080p"], "default_resolution": "720p", "models": MODELS,
            "rates_cny_per_second_before_group_multiplier": {"720p": 1.51, "1080p": 3.74},
            "expression": NEW_EXPR, "plugin_version": "1.0.2", "source_sha256": source_hash,
            "upstream_requests_sent": 0}
    if not args.apply:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("canvas-remove-480p-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    save_json(backup / "before.json", {"channel": before_channel, "plugins": before_plugins,
        "pricing": before_pricing, "options": {key: before_options[key] for key in
            ("GroupRatio", "GroupGroupRatio", "UserUsableGroups", "USDExchangeRate", "QuotaPerUnit")},
        "container": before_container, "tasks": tasks_before})
    api("/api/plugin/task", "POST", {"source": source, "sourceSha256": source_hash, "enabled": True,
        "remark": "Canvas 1.0.2; removed 480p from schema and request validation; offline fixtures 47/47; no upstream testing"})
    api("/api/plugin/task/canvas/activate", "POST", {"version": "1.0.2"})
    for name in MODELS:
        api("/api/option/model_pricing/preview", "POST", {"model_name": name, "pricing": draft})
    api("/api/option/model_pricing", "PATCH", {"changes": [
        {"model_name": entry["model_name"], "expected_version": entry["version"], "pricing": draft}
        for entry in before_pricing["entries"]]})

    after_pricing = pricing()
    for entry in after_pricing["entries"]:
        assert entry["configured"] == draft
        assert entry["usage_schema"]["resolution"]["enum"] == ["720p", "1080p"]
    after_options = options()
    for key in ("GroupRatio", "GroupGroupRatio", "UserUsableGroups", "USDExchangeRate", "QuotaPerUnit"):
        assert after_options[key] == before_options[key], "concurrent option change: " + key
    after_channel = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")[0]
    # No channel writes: preserve current status, key, mapping and user changes.
    assert after_channel == before_channel, "channel changed concurrently"
    assert container() == before_container
    runtime = api("/api/plugin/task/runtime/status")
    assert not runtime.get("plugin_errors", {}).get("canvas")
    plugin = next(p for p in api("/api/plugin/task") if p.get("meta", {}).get("key") == "canvas")
    assert plugin["meta"]["version"] == "1.0.2" and plugin["runtime_status"] == "registered"
    after_channel.pop("key", None)
    tasks_after = rows("SELECT row_to_json(t) FROM (SELECT count(*) AS count FROM tasks WHERE platform='canvas') t")[0]["count"]
    receipt = {**plan, "configured_at_utc": stamp, "backup": str(backup), "channel": after_channel,
        "pricing": after_pricing["entries"], "runtime_generation": runtime["current_generation"],
        "offline_fixture_cases_passed": 47, "canvas_tasks_before": tasks_before, "canvas_tasks_after": tasks_after,
        "container": before_container}
    save_json(backup / "after.json", receipt)
    persistent = Path("/opt/new-api/integrations/canvas")
    for name in ("plugin.js", "fixtures.json", "remove_480p.py", "README.md"):
        target = persistent / name
        target.write_bytes((staged / name).read_bytes())
        target.chmod(0o600)
    save_json(persistent / "pricing-config.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
