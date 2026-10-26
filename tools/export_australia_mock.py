#!/usr/bin/env python3
"""Import Australian channel/model/usage fixtures into the current local database.

Read through the ``ec2`` SSH alias, or reuse JSON with --from-files. Credentials
are sanitized, logs belong to the local test user, and existing data is retained.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import subprocess
from pathlib import Path
from typing import Any


CHANNEL_COLUMNS = [
    "id",
    "type",
    "key",
    "open_ai_organization",
    "test_model",
    "status",
    "name",
    "weight",
    "created_time",
    "test_time",
    "response_time",
    "base_url",
    "other",
    "balance",
    "balance_updated_time",
    "models",
    "group",
    "used_quota",
    "model_mapping",
    "status_code_mapping",
    "priority",
    "auto_ban",
    "other_info",
    "tag",
    "setting",
    "param_override",
    "header_override",
    "remark",
    "channel_info",
    "settings",
]

MODEL_COLUMNS = [
    "id",
    "model_name",
    "description",
    "icon",
    "tags",
    "vendor_id",
    "endpoints",
    "status",
    "sync_official",
    "created_time",
    "updated_time",
    "deleted_at",
    "name_rule",
]

LOG_COLUMNS = [
    "id",
    "user_id",
    "created_at",
    "type",
    "content",
    "username",
    "token_name",
    "model_name",
    "quota",
    "prompt_tokens",
    "completion_tokens",
    "use_time",
    "is_stream",
    "channel_id",
    "channel_name",
    "token_id",
    "group",
    "ip",
    "request_id",
    "upstream_request_id",
    "other",
]

VENDOR_COLUMNS = ["id", "name", "description", "icon", "status", "created_time", "updated_time", "deleted_at"]

PRICING_OPTION_KEYS = (
    "ModelRatio", "ModelPrice", "CompletionRatio", "CacheRatio", "CreateCacheRatio",
    "ImageRatio", "AudioRatio", "AudioCompletionRatio", "GroupRatio", "GroupGroupRatio",
    "UserUsableGroups", "billing_setting.billing_mode", "billing_setting.billing_expr",
    "billing_setting.plugin_billing_expr",
)


def fetch_json(ssh_host: str, query: str) -> list[dict[str, Any]]:
    command = [
        "ssh",
        "-o",
        "BatchMode=yes",
        "-o",
        "ConnectTimeout=15",
        ssh_host,
        "docker",
        "exec",
        "-i",
        "newapi-postgres",
        "psql",
        "-X",
        "-q",
        "-A",
        "-t",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "newapi",
        "-d",
        "newapi",
    ]
    result = subprocess.run(
        command,
        input=query,
        text=True,
        encoding="utf-8",
        errors="strict",
        capture_output=True,
        check=True,
    )
    output = result.stdout.strip()
    if not output:
        return []
    value = json.loads(output)
    if not isinstance(value, list):
        raise ValueError("remote query did not return a JSON array")
    return value


def query_for(table: str) -> str:
    if table == "channels":
        columns = ", ".join(f'c."{name}"' for name in CHANNEL_COLUMNS)
        columns = columns.replace('c."key"', "('mock-channel-key-' || c.id::text) AS key")
        return f"""
SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)
FROM (SELECT {columns} FROM channels c ORDER BY c.id) t;
"""
    if table == "models":
        columns = ", ".join(f'm."{name}"' for name in MODEL_COLUMNS)
        return f"""
SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.id), '[]'::json)
FROM (SELECT {columns} FROM models m ORDER BY m.id) t;
"""
    if table == "logs":
        columns = ", ".join(f'l."{name}"' for name in LOG_COLUMNS)
        return f"""
SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC, t.id DESC), '[]'::json)
FROM (SELECT {columns} FROM logs l ORDER BY l.created_at DESC, l.id DESC LIMIT 100) t;
"""
    if table == "vendors":
        return "SELECT COALESCE(json_agg(row_to_json(v) ORDER BY v.id), '[]'::json) FROM vendors v;"
    if table == "pricing-options":
        keys = ", ".join("'" + key + "'" for key in PRICING_OPTION_KEYS)
        return f"SELECT COALESCE(json_agg(row_to_json(o) ORDER BY o.key), '[]'::json) FROM options o WHERE key IN ({keys});"
    raise ValueError(f"unsupported table: {table}")


def find_mock_user(base_db: Path, username: str) -> tuple[int, str, int, str]:
    connection = sqlite3.connect(f"file:{base_db.resolve()}?mode=ro", uri=True)
    try:
        user = connection.execute(
            'SELECT id, username FROM users WHERE username = ? AND status = 1 ORDER BY id LIMIT 1',
            (username,),
        ).fetchone()
        if user is None:
            raise ValueError(f"active local user not found: {username}")
        token = connection.execute(
            'SELECT id, name FROM tokens WHERE user_id = ? AND status = 1 AND deleted_at IS NULL ORDER BY id LIMIT 1',
            (user[0],),
        ).fetchone()
        if token is None:
            return int(user[0]), str(user[1]), 0, "mock-token"
        return int(user[0]), str(user[1]), int(token[0]), str(token[1])
    finally:
        connection.close()


def sanitize_logs(logs: list[dict[str, Any]], user: tuple[int, str, int, str]) -> list[dict[str, Any]]:
    user_id, username, token_id, token_name = user
    sanitized: list[dict[str, Any]] = []
    for row in logs:
        item = dict(row)
        item["user_id"] = user_id
        item["username"] = username
        item["token_name"] = token_name
        item["token_id"] = token_id
        item["content"] = "[mock content redacted]" if item.get("content") else ""
        item["ip"] = "192.0.2.1"
        item["request_id"] = f"mock-request-{item['id']}"
        item["upstream_request_id"] = ""
        item["other"] = "{}"
        sanitized.append(item)
    return sanitized


def sanitize_channels(channels: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for row in channels:
        item = dict(row)
        channel_id = int(item["id"])
        item["key"] = f"mock-channel-key-{channel_id}"
        item["source_base_url"] = item.get("source_base_url", item.get("base_url"))
        item["base_url"] = f"https://mock.invalid/channel/{channel_id}"
        item["param_override"] = None
        item["header_override"] = None
        sanitized.append(item)
    return sanitized


def sanitize_channel_for_db(row: dict[str, Any]) -> dict[str, Any]:
    item = dict(row)
    channel_id = int(item["id"])
    item["key"] = f"mock-channel-key-{channel_id}"
    item["status"] = int(row["status"])
    item["auto_ban"] = 0
    item["test_time"] = 0
    item["base_url"] = f"https://mock.invalid/channel/{channel_id}"
    item["other"] = ""
    item["param_override"] = None
    item["header_override"] = None
    return item


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def insert_row(connection: sqlite3.Connection, table: str, row: dict[str, Any], columns: list[str]) -> None:
    names = ", ".join(f'"{column}"' for column in columns)
    values = [json.dumps(row.get(column), ensure_ascii=False) if isinstance(row.get(column), (dict, list)) else row.get(column) for column in columns]
    connection.execute(
        f'INSERT INTO "{table}" ({names}) VALUES ({", ".join("?" for _ in columns)})', values
    )


def merge_metadata(connection: sqlite3.Connection, table: str, row: dict[str, Any], columns: list[str], name_column: str) -> int:
    existing = connection.execute(
        f'SELECT id FROM "{table}" WHERE "{name_column}" = ? AND deleted_at IS ? ORDER BY id LIMIT 1',
        (row[name_column], row.get("deleted_at")),
    ).fetchone()
    local_row = dict(row)
    if existing is None:
        local_row.pop("id", None)
        insert_row(connection, table, local_row, [column for column in columns if column != "id"])
        return int(connection.execute("SELECT last_insert_rowid()").fetchone()[0])
    changed_columns = [column for column in columns if column != "id"]
    assignments = ", ".join(f'"{column}" = ?' for column in changed_columns)
    connection.execute(
        f'UPDATE "{table}" SET {assignments} WHERE id = ?',
        [local_row.get(column) for column in changed_columns] + [existing[0]],
    )
    return int(existing[0])


def import_database(database: Path, channels: list[dict[str, Any]], models: list[dict[str, Any]], logs: list[dict[str, Any]], vendors: list[dict[str, Any]], pricing_options: list[dict[str, Any]]) -> dict[str, Any]:
    backup_dir = Path("logs/mock-backups")
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_dir / f"{database.stem}-{stamp}.db"
    connection = sqlite3.connect(database, timeout=30)
    try:
        with sqlite3.connect(backup_path) as backup:
            connection.backup(backup)
        connection.execute("BEGIN IMMEDIATE")
        for option in pricing_options:
            if option["key"] not in PRICING_OPTION_KEYS:
                raise ValueError(f"unsupported pricing option: {option['key']}")
            merged = json.loads(option["value"])
            existing = connection.execute("SELECT value FROM options WHERE key = ?", (option["key"],)).fetchone()
            if existing:
                merged.update(json.loads(existing[0]))
            connection.execute(
                'INSERT INTO options ("key", value) VALUES (?, ?) ON CONFLICT ("key") DO UPDATE SET value=excluded.value',
                (option["key"], json.dumps(merged, ensure_ascii=False)),
            )
        vendor_ids = {0: 0}
        for row in vendors:
            vendor_ids[int(row["id"])] = merge_metadata(connection, "vendors", row, VENDOR_COLUMNS, "name")
        for row in models:
            local_row = dict(row)
            local_row["vendor_id"] = vendor_ids[int(row.get("vendor_id") or 0)]
            merge_metadata(connection, "models", local_row, MODEL_COLUMNS, "model_name")
        for source_row in channels:
            row = sanitize_channel_for_db(source_row)
            existing = connection.execute("SELECT name, key FROM channels WHERE id = ?", (row["id"],)).fetchone()
            if existing and existing[1] != row["key"]:
                raise ValueError(f"channel ID {row['id']} already belongs to a local channel")
            if existing:
                changed = [column for column in CHANNEL_COLUMNS if column != "id"]
                assignments = ", ".join(f'"{column}" = ?' for column in changed)
                values = [json.dumps(row.get(column), ensure_ascii=False) if isinstance(row.get(column), (dict, list)) else row.get(column) for column in changed]
                connection.execute(f"UPDATE channels SET {assignments} WHERE id = ?", values + [row["id"]])
            else:
                insert_row(connection, "channels", row, CHANNEL_COLUMNS)
            connection.execute("DELETE FROM abilities WHERE channel_id = ?", (row["id"],))
            for group in set(filter(None, (row.get("group") or "default").split(","))):
                for model in set(filter(None, (row.get("models") or "").split(","))):
                    connection.execute(
                        'INSERT INTO abilities ("group", model, channel_id, enabled, priority, weight, tag) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        (group.strip(), model.strip(), row["id"], row["status"] == 1, row["priority"], row["weight"], row["tag"]),
                    )
        inserted = 0
        next_id = connection.execute("SELECT coalesce(max(id), 0) FROM logs").fetchone()[0]
        for source_row in logs:
            row = dict(source_row)
            if not str(row.get("request_id", "")).startswith("mock-request-"):
                raise ValueError("only sanitized mock-request records can be imported")
            if connection.execute("SELECT 1 FROM logs WHERE request_id = ? AND user_id = ?", (row["request_id"], row["user_id"])).fetchone():
                continue
            next_id += 1
            row["id"] = next_id
            insert_row(connection, "logs", row, LOG_COLUMNS)
            inserted += 1
        connection.commit()
        return {
            "database": str(database.resolve()), "backup": str(backup_path.resolve()),
            "logs_inserted": inserted, "logs_already_present": len(logs) - inserted,
            "pricing_options_merged": len(pricing_options),
            "imported_enabled_channels": sum(row["status"] == 1 for row in channels),
            "counts": {table: connection.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] for table in ("channels", "models", "logs", "vendors")},
            "integrity": connection.execute("PRAGMA integrity_check").fetchone()[0],
        }
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ssh-host", default="ec2", help="SSH host alias for the Australian deployment")
    parser.add_argument("--output-dir", type=Path, default=Path("mock-data/australia"))
    parser.add_argument("--database", type=Path, default=Path("one-api.db"))
    parser.add_argument("--from-files", action="store_true", help="import previously exported JSON without connecting to the server")
    parser.add_argument("--user-name", default="test", help="local user that receives the exported usage logs")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.database.is_file():
        raise FileNotFoundError(f"local database not found: {args.database}")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    mock_user = find_mock_user(args.database, args.user_name)
    if args.from_files:
        channels = json.loads((args.output_dir / "channels.json").read_text(encoding="utf-8"))
        models = json.loads((args.output_dir / "models.json").read_text(encoding="utf-8"))
        logs = json.loads((args.output_dir / "logs.json").read_text(encoding="utf-8"))
        vendors = json.loads((args.output_dir / "vendors.json").read_text(encoding="utf-8"))
        pricing_options = json.loads((args.output_dir / "pricing-options.json").read_text(encoding="utf-8"))
        for row in logs:
            row.update(user_id=mock_user[0], username=mock_user[1], token_id=mock_user[2], token_name=mock_user[3])
    else:
        channels = sanitize_channels(fetch_json(args.ssh_host, query_for("channels")))
        models = fetch_json(args.ssh_host, query_for("models"))
        logs = sanitize_logs(fetch_json(args.ssh_host, query_for("logs")), mock_user)
        vendors = fetch_json(args.ssh_host, query_for("vendors"))
        pricing_options = fetch_json(args.ssh_host, query_for("pricing-options"))

    write_json(args.output_dir / "channels.json", channels)
    write_json(args.output_dir / "models.json", models)
    write_json(args.output_dir / "logs.json", logs)
    write_json(args.output_dir / "vendors.json", vendors)
    write_json(args.output_dir / "pricing-options.json", pricing_options)
    receipt = import_database(args.database, channels, models, logs, vendors, pricing_options)
    write_json(args.output_dir / "local-import.json", receipt)

    manifest = {
        "source": args.ssh_host,
        "imported_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "counts": {"channels": len(channels), "models": len(models), "logs": len(logs)},
        "database": str(args.database.resolve()),
        "sanitization": {
            "channel_key": "replaced with mock-channel-key-{id}",
            "channel_base_url": "replaced with https://mock.invalid/channel/{id}; original retained as source_base_url",
            "channel_status": "preserved from source, with matching ability enabled flags",
            "channel_param_and_header_override": "cleared",
            "usage_user_token_ip_request_identity": "replaced",
            "usage_content_and_other": "redacted",
            "usage_owner": {"id": mock_user[0], "username": mock_user[1], "token_id": mock_user[2], "token_name": mock_user[3]},
        },
    }
    write_json(args.output_dir / "manifest.json", manifest)
    print(json.dumps(receipt, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
