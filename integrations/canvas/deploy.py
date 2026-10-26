"""Install Canvas on the existing Australian deployment without upstream calls.

Run on the server as root. Read the Canvas key from stdin, never command-line
arguments. Use the existing root management token only in process memory.
The channel is deliberately disabled, unpriced, and excluded from auto tests.
"""

import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request


def sql(statement):
    result = subprocess.run(
        ["docker", "exec", "-i", "newapi-postgres", "psql", "-X", "-t", "-A",
         "-U", "newapi", "-d", "newapi", "-v", "ON_ERROR_STOP=1"],
        input=statement, text=True, capture_output=True, check=True,
    )
    return result.stdout.strip()


def rows(statement):
    return [json.loads(line) for line in sql(statement).splitlines() if line]


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    path.chmod(0o600)


def main():
    os.umask(0o077)
    canvas_key = sys.stdin.read().strip()
    if len(canvas_key) < 20 or "\n" in canvas_key or "\r" in canvas_key:
        raise ValueError("a single Canvas API key is required on stdin")
    staged = Path(__file__).resolve().parent
    source = (staged / "plugin.js").read_text(encoding="utf-8")
    source_hash = hashlib.sha256(source.encode()).hexdigest()
    admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]
    if not admin.get("access_token"):
        raise RuntimeError("no existing root management token")

    def api(path, method="GET", body=None):
        # This installer contacts only the local New API management API.
        if not path.startswith(("/api/plugin/task", "/api/channel/")):
            raise ValueError("management path is not allowed")
        if any(part in path for part in ["/test", "/fetch_models", "/update_balance", "/upstream_updates"]):
            raise ValueError("upstream operations are not allowed")
        headers = {"Authorization": "Bearer " + admin["access_token"].strip(),
                   "New-Api-User": str(admin["id"]), "Content-Type": "application/json"}
        payload = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
        request = urllib.request.Request("http://127.0.0.1:3000" + path, data=payload, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            # Never echo submitted headers, request bodies, or credentials.
            raise RuntimeError("management API returned HTTP " + str(error.code)) from None
        if result.get("success") is not True:
            raise RuntimeError("management API rejected " + path + ": " + str(result.get("message", "unknown error")))
        return result.get("data")

    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("canvas-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    existing_plugins = rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    existing_channels = rows("SELECT row_to_json(c) FROM channels c WHERE name='Canvas Seedance 2.5' OR base_url LIKE 'https://canvas.yydsapi.uno%'")
    prices = rows("SELECT row_to_json(o) FROM options o WHERE key IN ('ModelPrice','ModelRatio','billing_setting.billing_expr','billing_setting.billing_mode','billing_setting.plugin_billing_expr') ORDER BY key")
    save_json(backup / "before.json", {"plugins": existing_plugins, "channels": existing_channels, "pricing": prices})
    if existing_channels:
        raise RuntimeError("Canvas channel already exists; preserved configuration for review instead of creating a duplicate")
    if existing_plugins and any(p["source_hash"] != source_hash for p in existing_plugins):
        raise RuntimeError("another Canvas plugin already exists; preserved configuration without overwriting it")

    persistent = Path("/opt/new-api/integrations/canvas")
    persistent.mkdir(parents=True, mode=0o700, exist_ok=True)
    for name in ["plugin.js", "fixtures.json", "README.md", "deploy.py"]:
        src = staged / name
        if src.exists():
            target = persistent / name
            target.write_bytes(src.read_bytes())
            target.chmod(0o600)

    api("/api/plugin/task", "POST", {
        "source": source, "sourceSha256": source_hash, "enabled": True,
        "remark": "Canvas OpenAPI 1.0.0; offline fixtures passed; no upstream connectivity test performed",
    })
    listed = api("/api/plugin/task")
    plugin = next(p for p in listed if p.get("meta", {}).get("key") == "canvas")
    if plugin.get("runtime_status") != "registered" or not plugin.get("enabled"):
        raise RuntimeError("Canvas plugin did not register successfully")

    api("/api/channel/", "POST", {"mode": "single", "channel": {
        "type": 61, "status": 2, "name": "Canvas Seedance 2.5", "key": canvas_key,
        "base_url": "https://canvas.yydsapi.uno/api/v1/prot", "models": "sd2.5-qd",
        "group": "视频生成", "priority": 0, "weight": 0, "auto_ban": 0, "tag": "Canvas",
        "setting": json.dumps({"task_plugin_key": "canvas"}),
        "settings": json.dumps({"upstream_model_update_check_enabled": False,
                                 "upstream_model_update_auto_sync_enabled": False}),
        "remark": "插件已接入；按要求暂不定价、保持禁用；未进行连通性测试",
    }})
    channels = rows("SELECT row_to_json(c) FROM (SELECT id,type,status,name,base_url,models,\"group\",auto_ban,test_time,test_model,setting,settings,key FROM channels WHERE name='Canvas Seedance 2.5') c")
    if len(channels) != 1:
        raise RuntimeError("expected exactly one newly configured Canvas channel")
    channel = channels[0]
    if channel["key"] != canvas_key or channel["status"] != 2 or channel["auto_ban"] != 0 or channel["test_time"] != 0:
        raise RuntimeError("channel credential/status/no-test verification failed")
    channel.pop("key")
    channel["key_configured"] = True
    if json.loads(channel["setting"])["task_plugin_key"] != "canvas":
        raise RuntimeError("channel plugin binding did not persist")
    after_prices = rows("SELECT row_to_json(o) FROM options o WHERE key IN ('ModelPrice','ModelRatio','billing_setting.billing_expr','billing_setting.billing_mode','billing_setting.plugin_billing_expr') ORDER BY key")
    if prices != after_prices:
        raise RuntimeError("pricing changed during installation; inspect the snapshot")
    task_count = int(sql("SELECT count(*) FROM tasks WHERE platform='canvas'"))
    if task_count:
        raise RuntimeError("unexpected Canvas tasks found after configuration")
    runtime = api("/api/plugin/task/runtime/status")
    if runtime.get("plugin_errors", {}).get("canvas"):
        raise RuntimeError("Canvas runtime reports a plugin error")
    receipt = {
        "installed_at_utc": stamp, "channel": channel,
        "plugin": {"key": "canvas", "version": plugin["meta"]["version"], "source_sha256": source_hash,
                   "runtime_status": plugin["runtime_status"], "enabled": plugin["enabled"]},
        "runtime_generation": runtime.get("current_generation"), "backup": str(backup),
        "pricing_changed": False, "upstream_requests_sent": 0, "canvas_tasks": task_count,
    }
    save_json(persistent / "deployment.json", receipt)
    save_json(backup / "after.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
