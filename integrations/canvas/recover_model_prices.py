"""Recover accidental bulk price reset from today's protected snapshot.

Uses only local New API configuration APIs. Preserves post-reset model edits,
channel/plugin configuration, balances and group settings. Never tests upstream.
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
import urllib.error
import urllib.request

sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows, save_json

KEYS = ["AudioCompletionRatio", "AudioRatio", "CacheRatio", "CompletionRatio", "CreateCacheRatio", "ImageRatio", "ModelPrice", "ModelRatio", "billing_setting.billing_expr", "billing_setting.billing_mode", "billing_setting.plugin_billing_expr"]
SOURCE = Path("/opt/new-api/config-backups/canvas-remove-480p-20261026T131708Z")
EXPECTED_RESET_ID = 4414


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]

    def api(path, method="GET", body=None):
        if path.split("?")[0] not in ("/api/option/model_pricing", "/api/option/model_pricing/preview", "/api/plugin/task/runtime/status"):
            raise ValueError("only local pricing/runtime management endpoints are allowed")
        data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        request = urllib.request.Request("http://127.0.0.1:3000" + path, data=data, method=method,
            headers={"Authorization": "Bearer " + admin["access_token"].strip(),
                     "New-Api-User": str(admin["id"]), "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            try:
                detail = json.load(error).get("message", "")
            except Exception:
                detail = ""
            raise RuntimeError("local management HTTP " + str(error.code) + ": " + str(detail)) from None
        if not result.get("success"):
            raise RuntimeError("local management request rejected: " + str(result.get("message", "")))
        return result.get("data")

    def price_maps():
        quoted = ",".join("'" + key + "'" for key in KEYS)
        return {row["key"]: json.loads(row["value"]) for row in rows("SELECT row_to_json(o) FROM options o WHERE key IN (" + quoted + ") ORDER BY key")}

    def model_values(maps, name):
        values = {key: entries[name] for key, entries in maps.items() if key != "billing_setting.plugin_billing_expr" and name in entries}
        overrides = {key.split("::", 1)[0]: value for key, value in maps.get("billing_setting.plugin_billing_expr", {}).items() if key.split("::", 1)[-1] == name}
        if overrides:
            values["billing_setting.plugin_billing_expr"] = overrides
        return values

    def set_model(maps, name, values):
        for key in KEYS:
            if key == "billing_setting.plugin_billing_expr":
                for variant in list(maps[key]):
                    if variant.split("::", 1)[-1] == name:
                        del maps[key][variant]
                for plugin, expression in values.get(key, {}).items():
                    maps[key][plugin + "::" + name] = expression
            else:
                maps[key].pop(name, None)
                if key in values:
                    maps[key][name] = values[key]

    def protected_config():
        # Exclude mutable usage statistics; hash credentials without printing them.
        channels = rows("SELECT row_to_json(c) FROM (SELECT id,type,key,name,status,models,\"group\",base_url,model_mapping,setting,settings,param_override,header_override,auto_ban FROM channels ORDER BY id) c")
        plugins = rows("SELECT row_to_json(p) FROM (SELECT key,version,source_hash,enabled,active FROM task_plugins ORDER BY key,version) p")
        quoted = ",".join("'" + key + "'" for key in KEYS)
        options = rows("SELECT row_to_json(o) FROM options o WHERE key NOT IN (" + quoted + ") ORDER BY key")
        return {"channel_config_sha256": digest(channels), "plugin_config_sha256": digest(plugins), "other_options_sha256": digest(options)}

    def container():
        result = subprocess.run(["docker", "inspect", "newapi"], capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)[0]
        return {"image": data["Image"], "started_at": data["State"]["StartedAt"], "status": data["State"]["Status"], "health": data["State"].get("Health", {}).get("Status")}

    reset = rows("SELECT row_to_json(a) FROM (SELECT id,created_at,other::jsonb->'op'->'params'->'models' AS models FROM audit_logs WHERE action='model.pricing.update' AND success=true AND jsonb_array_length(other::jsonb->'op'->'params'->'models')>100 ORDER BY id DESC LIMIT 1) a")[0]
    if reset["id"] != EXPECTED_RESET_ID:
        raise RuntimeError("another bulk change was found; stop for review")
    later = rows("SELECT row_to_json(a) FROM (SELECT id,action,other::jsonb->'op'->'params' AS params FROM audit_logs WHERE success=true AND id>" + str(reset["id"]) + " AND action IN ('model.pricing.update','option.update') ORDER BY id) a")
    preserved = set()
    for event in later:
        if event["action"] == "model.pricing.update":
            preserved.update((event["params"] or {}).get("models", []))
        elif (event["params"] or {}).get("key") in KEYS:
            raise RuntimeError("post-reset whole-map pricing edit found; review before restoring")
    snapshot = json.loads((SOURCE / "before.json").read_text())
    saved = {key: json.loads(value) for key, value in snapshot["pricing"]["options"].items()}
    # Apply the successful 21:17 update made immediately after the snapshot.
    after = json.loads((SOURCE / "after.json").read_text())
    for entry in after["pricing"]:
        set_model(saved, entry["model_name"], entry["configured"])
    current = price_maps()
    names = sorted(name for name in reset["models"] if name not in preserved and model_values(current, name) != model_values(saved, name))
    expected = json.loads(json.dumps(current))
    for name in names:
        set_model(expected, name, model_values(saved, name))
    snapshot_api = api("/api/option/model_pricing?" + urlencode([("model", name) for name in names]))
    entries = {entry["model_name"]: entry for entry in snapshot_api["entries"]}
    changes = [{"model_name": name, "expected_version": entries[name]["version"], "pricing": model_values(saved, name)} for name in names]
    if any(entries[name]["configured"] != model_values(current, name) for name in names):
        raise RuntimeError("database and management pricing snapshots disagree")
    plan = {"reset_audit_id": reset["id"], "reset_time_shanghai": datetime.datetime.fromtimestamp(reset["created_at"], datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
        "reset_model_count": len(reset["models"]), "source_snapshot": str(SOURCE), "restore_model_count": len(names),
        "restore_models": names, "preserved_post_reset_models": sorted(preserved),
        "changed_option_counts": {key: {"before": len(current[key]), "after": len(expected[key])} for key in KEYS if current[key] != expected[key]},
        "upstream_requests_sent": 0}
    if not args.apply:
        print(json.dumps(plan, ensure_ascii=False, indent=2))
        return
    if not changes:
        raise RuntimeError("no remaining pricing differences to restore")
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("price-reset-recovery-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    protected_before = protected_config()
    container_before = container()
    save_json(backup / "before.json", {"pricing_options": current, "snapshot": snapshot_api, "protected_config": protected_before, "container": container_before})
    save_json(backup / "plan.json", {**plan, "changes": changes})
    for change in changes:
        api("/api/option/model_pricing/preview", "POST", {"model_name": change["model_name"], "pricing": change["pricing"]})
    if price_maps() != current:
        raise RuntimeError("prices changed concurrently; no restore was applied")
    api("/api/option/model_pricing", "PATCH", {"changes": changes})
    actual = price_maps()
    if actual != expected:
        raise RuntimeError("price readback differs from the recovery plan; inspect " + str(backup))
    readback = api("/api/option/model_pricing?" + urlencode([("model", name) for name in names + sorted(preserved)]))
    for entry in readback["entries"]:
        assert entry["configured"] == model_values(expected, entry["model_name"])
    protected_after = protected_config()
    assert protected_after == protected_before, "unrelated configuration changed concurrently"
    assert container() == container_before
    runtime = api("/api/plugin/task/runtime/status")
    receipt = {**plan, "restored_at_utc": stamp, "backup": str(backup), "restored_options_sha256": digest(actual),
        "unrelated_config_unchanged": protected_after == protected_before, "container": container_before,
        "runtime_generation": runtime["current_generation"], "pricing_verified_models": len(readback["entries"])}
    save_json(backup / "after.json", {**receipt, "pricing_options": actual, "entries": readback["entries"]})
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
