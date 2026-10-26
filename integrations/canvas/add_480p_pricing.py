"""Restore only Canvas 480p model prices through the local management API."""
import datetime
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlencode
import urllib.request

sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows, save_json

MODELS = ["seedance-2.5", "sd2.5-qd"]
OLD_EXPR = ('u("resolution") == "720p" ? tier("720p", u("seconds") * 1.51) : '
            'tier("1080p", u("seconds") * 3.74)')
NEW_EXPR = ('u("resolution") == "480p" ? tier("480p", u("seconds") * 0.67) : ' + OLD_EXPR)


def main():
    os.umask(0o077)
    admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]

    def api(path, method="GET", body=None):
        allowed = {"/api/option/model_pricing", "/api/option/model_pricing/preview",
                   "/api/option/", "/api/plugin/task/runtime/status"}
        if path.split("?", 1)[0] not in allowed:
            raise ValueError("unsupported management endpoint")
        if method != "GET" and path not in {"/api/option/model_pricing", "/api/option/model_pricing/preview"}:
            raise ValueError("only model pricing writes are allowed")
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request("http://127.0.0.1:3000" + path, data=data, method=method,
            headers={"Authorization": "Bearer " + admin["access_token"].strip(),
                     "New-Api-User": str(admin["id"]), "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
        if not result.get("success"):
            raise RuntimeError("management operation failed: " + str(result.get("message", "")))
        return result.get("data")

    pricing_path = "/api/option/model_pricing?" + urlencode([("model", name) for name in MODELS])
    before = api(pricing_path)
    channels_before = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")
    plugins_before = rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    runtime_before = api("/api/plugin/task/runtime/status")
    options_before = {item["key"]: item["value"] for item in api("/api/option/")}
    if {entry["model_name"] for entry in before["entries"]} != set(MODELS):
        raise RuntimeError("expected both Seedance models")
    changes = []
    for entry in before["entries"]:
        draft = dict(entry["configured"])
        if draft.get("billing_setting.billing_mode") != "tiered_expr" or draft.get("billing_setting.billing_expr") != OLD_EXPR:
            raise RuntimeError("model pricing changed; review before modifying")
        draft["billing_setting.billing_expr"] = NEW_EXPR
        api("/api/option/model_pricing/preview", "POST", {"model_name": entry["model_name"], "pricing": draft})
        changes.append({"model_name": entry["model_name"], "expected_version": entry["version"], "pricing": draft})

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("canvas-add-480p-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    save_json(backup / "before.json", {"pricing": before, "channel": channels_before,
        "plugins": plugins_before, "options": options_before, "runtime": runtime_before})
    save_json(backup / "changes.json", {"changes": changes})
    api("/api/option/model_pricing", "PATCH", {"changes": changes})
    after = api(pricing_path)
    expected = {change["model_name"]: change["pricing"] for change in changes}
    assert all(entry["configured"] == expected[entry["model_name"]] for entry in after["entries"])
    assert channels_before == rows("SELECT row_to_json(c) FROM channels c WHERE id=79"), "channel changed concurrently"
    assert plugins_before == rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'"), "plugin changed concurrently"
    runtime_after = api("/api/plugin/task/runtime/status")
    assert runtime_after["current_generation"] == runtime_before["current_generation"]
    options_after = {item["key"]: item["value"] for item in api("/api/option/")}
    changed_keys = sorted(key for key in set(options_before) | set(options_after)
                          if options_before.get(key) != options_after.get(key))
    assert set(changed_keys) <= {"billing_setting.billing_expr"}, "unexpected options changed: " + str(changed_keys)
    receipt = {"backup": str(backup), "models": MODELS, "expression": NEW_EXPR,
        "group_ratio": json.loads(options_after["GroupRatio"])["Seedance-QT"],
        "plugin_unchanged": True, "runtime_generation": runtime_after["current_generation"],
        "schema_resolutions": after["entries"][0]["usage_schema"]["resolution"]["enum"],
        "upstream_requests_sent": 0, "changed_option_keys": changed_keys}
    save_json(backup / "after.json", {"pricing": after, "receipt": receipt})
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
