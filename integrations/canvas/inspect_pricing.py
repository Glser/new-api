"""Read local management configuration only; never contact Canvas."""
import json
import sys
from urllib.parse import urlencode

sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows
import urllib.request

admin = rows("SELECT row_to_json(u) FROM (SELECT id,access_token FROM users WHERE role=100 AND status=1 ORDER BY id LIMIT 1) u")[0]
def api(path):
    req = urllib.request.Request("http://127.0.0.1:3000" + path, headers={"Authorization": "Bearer " + admin["access_token"].strip(), "New-Api-User": str(admin["id"])})
    with urllib.request.urlopen(req, timeout=30) as response:
        result = json.load(response)
    if not result.get("success"):
        raise RuntimeError("management read failed")
    return result.get("data")

options = {o["key"]: o["value"] for o in api("/api/option/")}
selected = {k: v for k, v in options.items() if k in ("GroupRatio", "GroupGroupRatio", "UserUsableGroups", "USDExchangeRate", "QuotaPerUnit") or k.startswith(("group_ratio_setting.", "general_setting.", "quota_setting."))}
channel = api("/api/channel/79")
channel.pop("key", None)
snapshot = api("/api/option/model_pricing?" + urlencode([("model", "seedance-2.5"), ("model", "sd2.5-qd")]))
snapshot.pop("options", None)
print(json.dumps({"options": selected, "channel": channel, "pricing": snapshot, "runtime": api("/api/plugin/task/runtime/status"), "canvas_task_count": rows("SELECT row_to_json(x) FROM (SELECT count(*) AS count FROM tasks WHERE platform='canvas') x")}, ensure_ascii=False, indent=2))
