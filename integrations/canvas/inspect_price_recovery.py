"""Inspect price-only snapshots and audit metadata without printing credentials."""
import datetime
import json
from pathlib import Path
import sys
sys.path.insert(0, "/opt/new-api/integrations/canvas")
from deploy import rows

KEYS = ["AudioCompletionRatio", "AudioRatio", "CacheRatio", "CompletionRatio", "CreateCacheRatio", "ImageRatio", "ModelPrice", "ModelRatio", "billing_setting.billing_expr", "billing_setting.billing_mode", "billing_setting.plugin_billing_expr"]
quoted = ",".join("'" + key + "'" for key in KEYS)
current = {entry["key"]: json.loads(entry["value"]) for entry in rows("SELECT row_to_json(o) FROM options o WHERE key IN (" + quoted + ")")}
summaries = []
for path in sorted(Path("/opt/new-api/config-backups").glob("canvas-*/before.json")):
    data = json.loads(path.read_text())
    prices = data.get("pricing")
    if isinstance(prices, dict) and isinstance(prices.get("options"), dict):
        saved = {key: json.loads(value) for key, value in prices["options"].items()}
    elif isinstance(prices, list):
        saved = {row["key"]: json.loads(row["value"]) for row in prices}
    else:
        continue
    diff = {}
    for key in sorted(set(current) | set(saved)):
        if key not in saved:
            continue
        old, new = saved[key], current.get(key, {})
        added = sorted(set(new) - set(old))
        removed = sorted(set(old) - set(new))
        changed = sorted(name for name in set(old) & set(new) if old[name] != new[name])
        if added or removed or changed:
            diff[key] = {"saved_count": len(old), "current_count": len(new), "added_count": len(added), "removed_count": len(removed), "changed_count": len(changed),
                         "removed_sample": removed[:30], "added_sample": added[:12],
                         "changed_sample": [{"model": name, "before": old[name], "now": new[name]} for name in changed[:18]]}
    summaries.append({"snapshot": str(path), "keys": sorted(saved), "differences": diff})
tables = rows("SELECT row_to_json(t) FROM (SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('audit_logs','logs')) t")
audit = []
if any(t["table_name"] == "audit_logs" for t in tables):
    audit = rows("SELECT row_to_json(a) FROM (SELECT id,created_at,action,route,success,other::jsonb->'op' AS operation FROM audit_logs WHERE created_at > extract(epoch from now())::bigint-86400 AND (action LIKE '%pricing%' OR action LIKE '%option%' OR route LIKE '%option%' OR route LIKE '%ratio%') ORDER BY id DESC LIMIT 80) a")
    for event in audit:
        event["time_shanghai"] = datetime.datetime.fromtimestamp(event["created_at"], datetime.timezone(datetime.timedelta(hours=8))).isoformat()
print(json.dumps({"current_counts": {key: len(value) for key,value in current.items()}, "snapshots": summaries, "audit_events": audit, "log_tables": tables}, ensure_ascii=False, indent=2))
