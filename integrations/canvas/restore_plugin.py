"""Reactivate the installed three-resolution Canvas version; no upstream HTTP."""
import datetime
import difflib
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

TARGET_HASH = "63fcb8ceb8a83c66e79622c74fa3ba690ec4518bc7ced043bfc2eb20fb664b32"
CURRENT_HASH = "2cdd34b53f14f4d21bcbb70a9f97d8491adbf0e6fed33d0604e122c8b3434985"


def main():
    os.umask(0o077)
    admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]

    def api(path, method="GET", body=None):
        allowed = {"/api/plugin/task/canvas/activate", "/api/plugin/task/runtime/status",
                   "/api/plugin/task", "/api/option/", "/api/option/model_pricing"}
        if path.split("?", 1)[0] not in allowed or (method != "GET" and path != "/api/plugin/task/canvas/activate"):
            raise ValueError("only version activation and configuration reads are allowed")
        req = urllib.request.Request("http://127.0.0.1:3000" + path, method=method,
            data=json.dumps(body).encode() if body is not None else None,
            headers={"Authorization": "Bearer " + admin["access_token"].strip(),
                     "New-Api-User": str(admin["id"]), "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.load(response)
        if not result.get("success"):
            raise RuntimeError("management operation failed: " + str(result.get("message", "")))
        return result.get("data")

    def container_state():
        result = subprocess.run(["docker", "inspect", "newapi"], capture_output=True, text=True, check=True)
        entry = json.loads(result.stdout)[0]
        return {"image": entry["Image"], "started_at": entry["State"]["StartedAt"],
                "health": entry["State"].get("Health", {}).get("Status")}

    plugins = rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    active = next(p for p in plugins if p["active"])
    target = next(p for p in plugins if p["version"] == "1.0.1")
    assert active["source_hash"] == CURRENT_HASH and active["enabled"]
    assert target["source_hash"] == TARGET_HASH and target["enabled"]
    assert hashlib.sha256(target["source"].encode()).hexdigest() == TARGET_HASH
    channel = rows("SELECT row_to_json(c) FROM channels c WHERE id=79")
    options = api("/api/option/")
    pricing_path = "/api/option/model_pricing?" + urlencode([("model", "seedance-2.5"), ("model", "sd2.5-qd")])
    pricing_before = api(pricing_path)
    container_before = container_state()
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup = Path("/opt/new-api/config-backups") / ("canvas-restore-plugin-" + stamp)
    backup.mkdir(parents=True, mode=0o700, exist_ok=False)
    save_json(backup / "before.json", {"plugins": plugins, "channel": channel, "options": options,
        "pricing": pricing_before, "runtime": api("/api/plugin/task/runtime/status"), "container": container_before})
    (backup / "plugin.js").write_text(target["source"], encoding="utf-8")
    fixtures = json.loads((Path(__file__).parent / "fixtures.json").read_text(encoding="utf-8"))
    cases = [case for case in fixtures["cases"] if not case["name"].startswith("Reject removed 480p")]
    for index in (0, 24, 32, 33):
        case = json.loads(json.dumps(fixtures["cases"][index]).replace('"720p"', '"480p"'))
        case["name"] = "480p: " + case["name"]
        cases.append(case)
    fixtures["cases"] = cases
    save_json(backup / "fixtures.json", fixtures)
    print("".join(difflib.unified_diff(active["source"].splitlines(True), target["source"].splitlines(True),
          fromfile="canvas-1.0.2", tofile="canvas-1.0.1")), flush=True)
    container_dir = "/tmp/canvas-restore-" + stamp
    subprocess.run(["docker", "exec", "newapi", "mkdir", "-p", container_dir], check=True)
    for filename in ("plugin.js", "fixtures.json"):
        subprocess.run(["docker", "cp", str(backup / filename), "newapi:" + container_dir + "/" + filename], check=True)
    for command in (["lint", container_dir + "/plugin.js"],
                    ["test", container_dir + "/plugin.js", "--fixture", container_dir + "/fixtures.json"]):
        result = subprocess.run(["docker", "exec", "newapi", "/new-api", "plugin"] + command,
                                text=True, capture_output=True, check=True)
        print(result.stdout, flush=True)
    # Recheck the exact snapshot before changing the active version.
    assert plugins == rows("SELECT row_to_json(p) FROM task_plugins p WHERE key='canvas'")
    api("/api/plugin/task/canvas/activate", "POST", {"version": "1.0.1"})
    runtime = api("/api/plugin/task/runtime/status")
    assert not runtime.get("plugin_errors", {}).get("canvas")
    plugin = next(p for p in api("/api/plugin/task") if p.get("meta", {}).get("key") == "canvas")
    assert plugin["meta"]["version"] == "1.0.1" and plugin["runtime_status"] == "registered" and plugin["enabled"]
    after = api(pricing_path)
    for entry in after["entries"]:
        before = next(p for p in pricing_before["entries"] if p["model_name"] == entry["model_name"])
        assert entry["configured"] == before["configured"] and entry["version"] == before["version"]
        assert entry["usage_schema"]["resolution"]["enum"] == ["480p", "720p", "1080p"]
    assert channel == rows("SELECT row_to_json(c) FROM channels c WHERE id=79"), "channel changed concurrently"
    assert {o["key"]: o["value"] for o in options} == {o["key"]: o["value"] for o in api("/api/option/")}
    assert container_before == container_state()
    persistent = Path("/opt/new-api/integrations/canvas")
    for filename in ("plugin.js", "fixtures.json"):
        (persistent / filename).write_bytes((backup / filename).read_bytes())
        (persistent / filename).chmod(0o600)
    receipt = {"backup": str(backup), "active_version": "1.0.1", "source_sha256": TARGET_HASH,
        "runtime_generation": runtime["current_generation"], "resolutions": ["480p", "720p", "1080p"],
        "offline_fixtures_passed": len(cases), "prices_groups_channel_preserved": True, "upstream_requests_sent": 0}
    save_json(backup / "after.json", {"receipt": receipt, "pricing": after, "runtime": runtime})
    save_json(persistent / "plugin-restore.json", receipt)
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
