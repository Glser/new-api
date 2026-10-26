"""Configure Canvas prices through local New API management endpoints only.

Run on the Australian server as root after offline plugin fixture validation.
The channel stays disabled. No quotes, submissions, or upstream calls occur.
"""

import argparse
import datetime
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlencode
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows, save_json

GROUP = "Seedance-QT"
MODELS = ["seedance-2.5", "sd2.5-qd"]
RATES_CNY = {"480p": "0.67", "720p": "1.51", "1080p": "3.74"}
OLD_HASH = "40e34ca3f35d31440f0929a2f7fa8347f49fc2cc5434697aaf1ec0de770fb242"


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
        if not path.startswith(allowed) or any(p in path for p in ("/test", "/fetch_models", "/update_balance", "/upstream_updates", "/dry-run")):
            raise ValueError("only configuration management operations are allowed")
        headers = {"Authorization": "Bearer " + admin["access_token"].strip(),
                   "New-Api-User": str(admin["id"]), "Content-Type": "application/json"}
        payload = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        request = urllib.request.Request("http://127.0.0.1:3000" + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError("management API HTTP " + str(error.code) + " at " + path) from None
        if result.get("success") is not True:
            raise RuntimeError("management API rejected " + path + ": " + str(result.get("message", "unknown error")))
        return result.get("data")

    def options():
        return {entry["key"]: entry["value"] for entry in api("/api/option/")}

    def pricing():
        return api("/api/option/model_pricing?" + urlencode([("model", m) for m in MODELS]))

    def container_state():
        result = subprocess.run(["docker", "inspect", "newapi"], text=True, capture_output=True, check=True)
        inspect = json.loads(result.stdout)[0]
        return {"image": inspect["Image"], "started_at": inspect["State"]["StartedAt"],
                "status": inspect["State"]["Status"], "health": inspect["State"].get("Health", {}).get("Status")}

    before_options = options()
    if before_options.get("general_setting.quota_display_type") != "CNY":
        raise RuntimeError("the site's currency display changed; review before pricing")
    exchange = Decimal(before_options["USDExchangeRate"])
    if exchange != Decimal(1):
        raise RuntimeError("the site's quota conversion changed; review before pricing")
    quota_per_unit = Decimal(before_options["QuotaPerUnit"])
    before_channel = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")[0]
    if before_channel["status"] != 2 or before_channel["type"] != 61 or before_channel["test_time"] != 0:
        raise RuntimeError("unexpected channel state; preserve it for review")
    if json.loads(before_channel["setting"])["task_plugin_key"] != "canvas":
        raise RuntimeError("channel 79 is no longer bound to Canvas")
    before_plugins = rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    if not any(p["source_hash"] in (OLD_HASH, source_hash) for p in before_plugins):
        raise RuntimeError("Canvas plugin changed since the original deployment")
    before_pricing = pricing()
    for entry in before_pricing["entries"]:
        if entry["configured"]:
            raise RuntimeError("model already has pricing; preserve it for review")
    before_task_count = rows("SELECT row_to_json(t) FROM (SELECT count(*) AS count FROM tasks WHERE platform='canvas') t")[0]["count"]
    before_container = container_state()

    group_ratios = json.loads(before_options["GroupRatio"])
    usable_groups = json.loads(before_options["UserUsableGroups"])
    if GROUP in group_ratios or GROUP in usable_groups:
        raise RuntimeError("Seedance-QT already exists; preserve it for review")
    group_ratios[GROUP] = 1
    usable_groups[GROUP] = "Seedance 2.5，按输出视频秒数计费"
    rates = {resolution: float(Decimal(amount) / exchange) for resolution, amount in RATES_CNY.items()}
    expression = ('u("resolution") == "480p" ? tier("480p", u("seconds") * ' + str(rates["480p"]) + ') : '
                  'u("resolution") == "720p" ? tier("720p", u("seconds") * ' + str(rates["720p"]) + ') : '
                  'tier("1080p", u("seconds") * ' + str(rates["1080p"]) + ')')
    draft = {"billing_setting.billing_mode": "tiered_expr", "billing_setting.billing_expr": expression}
    mapping = json.loads(before_channel.get("model_mapping") or "{}")
    mapping["seedance-2.5"] = "sd2.5-qd"
    models = list(dict.fromkeys(before_channel["models"].split(",") + MODELS))
    patch = {k: before_channel[k] for k in ("id", "type", "name", "base_url", "setting", "settings")}
    patch.update(models=",".join(models), group=GROUP, model_mapping=json.dumps(mapping),
                 remark="已配置Seedance-QT x1及按输出秒计费：480p ¥0.67/s、720p ¥1.51/s、1080p ¥3.74/s；参考官方无视频输入示例折算；保持禁用，未测试上游")
    vectors = []
    for resolution, amount in RATES_CNY.items():
        for seconds in ("1", "4", "5.5", "3600"):
            cny = Decimal(amount) * Decimal(seconds)
            quota = int((cny / exchange * quota_per_unit).quantize(Decimal(1), rounding=ROUND_HALF_UP))
            assert abs(Decimal(quota) / quota_per_unit * exchange - cny) <= exchange / quota_per_unit
            vectors.append({"resolution": resolution, "seconds": float(seconds), "cny": str(cny), "quota": quota})
    plan = {"channel_id": 79, "channel_status": "disabled", "group": GROUP, "group_ratio": 1,
            "models": models, "model_mapping": mapping, "pricing_basis": "fixed output seconds, converted from official no-input-video examples; not exact official token billing",
            "rates_cny_per_second": RATES_CNY, "usd_exchange_rate": str(exchange), "quota_per_unit": str(quota_per_unit),
            "expression": expression, "plugin_source_sha256": source_hash, "billing_vectors": vectors,
            "canvas_tasks_before": before_task_count, "upstream_requests_sent": 0}
    if not args.apply:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("canvas-pricing-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    save_json(backup / "before.json", {"channel": before_channel, "plugins": before_plugins,
                                      "options": {k: before_options[k] for k in ("GroupRatio", "UserUsableGroups", "USDExchangeRate", "QuotaPerUnit")},
                                      "pricing": before_pricing, "container": before_container})
    save_json(backup / "plan.json", plan)

    api("/api/plugin/task", "POST", {"source": source, "sourceSha256": source_hash, "enabled": True,
                                        "remark": "Canvas 1.0.1; alias and 480p/720p/1080p pricing schema; offline fixtures passed 43/43; no upstream tests"})
    api("/api/plugin/task/canvas/activate", "POST", {"version": "1.0.1"})
    plugin = next(p for p in api("/api/plugin/task") if p.get("meta", {}).get("key") == "canvas")
    if plugin.get("runtime_status") != "registered" or not plugin.get("enabled") or plugin["meta"]["version"] != "1.0.1":
        raise RuntimeError("updated Canvas plugin failed to register; backup " + str(backup))
    for name in MODELS:
        api("/api/option/model_pricing/preview", "POST", {"model_name": name, "pricing": draft})
    api("/api/option/model_pricing", "PATCH", {"changes": [
        {"model_name": entry["model_name"], "expected_version": entry["version"], "pricing": draft}
        for entry in before_pricing["entries"]]})
    for key, value in (("GroupRatio", group_ratios), ("UserUsableGroups", usable_groups)):
        if options()[key] != before_options[key]:
            raise RuntimeError(key + " changed concurrently; backup " + str(backup))
        api("/api/option/", "PUT", {"key": key, "value": json.dumps(value, ensure_ascii=False)})
    api("/api/channel/", "PUT", patch)

    after_options = options()
    assert json.loads(after_options["GroupRatio"]) == group_ratios
    assert json.loads(after_options["UserUsableGroups"]) == usable_groups
    assert after_options["USDExchangeRate"] == before_options["USDExchangeRate"]
    assert after_options["QuotaPerUnit"] == before_options["QuotaPerUnit"]
    after_channel = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")[0]
    for key in ("key", "status", "auto_ban", "test_time", "used_quota", "base_url", "setting", "settings"):
        assert after_channel[key] == before_channel[key], "unexpected channel change in " + key
    assert after_channel["group"] == GROUP
    assert set(after_channel["models"].split(",")) == set(models)
    assert json.loads(after_channel["model_mapping"])["seedance-2.5"] == "sd2.5-qd"
    readback = api("/api/channel/79")
    assert readback["status"] == 2 and readback["group"] == GROUP
    after_pricing = pricing()
    for entry in after_pricing["entries"]:
        assert entry["configured"] == draft
        assert entry["effective"]["billing_setting.billing_expr"] == expression
        assert entry["usage_schema"]["seconds"]["unit"] == "second"
        assert entry["usage_schema"]["resolution"]["enum"] == ["480p", "720p", "1080p"]
    after_task_count = rows("SELECT row_to_json(t) FROM (SELECT count(*) AS count FROM tasks WHERE platform='canvas') t")[0]["count"]
    assert after_task_count == before_task_count
    after_container = container_state()
    assert after_container == before_container
    runtime = api("/api/plugin/task/runtime/status")
    assert not runtime.get("plugin_errors", {}).get("canvas")
    abilities = rows("SELECT row_to_json(a) FROM abilities a WHERE channel_id=79")
    assert {a["model"] for a in abilities} == set(models)
    assert all(a["group"] == GROUP and not a["enabled"] for a in abilities)
    after_channel.pop("key", None)
    receipt = {**plan, "configured_at_utc": stamp, "backup": str(backup), "channel": after_channel,
               "pricing": after_pricing["entries"], "canvas_tasks_after": after_task_count,
               "container": after_container, "runtime_generation": runtime["current_generation"],
               "offline_fixture_cases_passed": 43, "abilities": abilities}
    save_json(backup / "after.json", receipt)
    persistent = Path("/opt/new-api/integrations/canvas")
    for name in ("plugin.js", "fixtures.json", "apply_pricing.py", "inspect_pricing.py", "README.md"):
        if (staged / name).exists():
            target = persistent / name
            target.write_bytes((staged / name).read_bytes())
            target.chmod(0o600)
    save_json(persistent / "pricing-config.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
