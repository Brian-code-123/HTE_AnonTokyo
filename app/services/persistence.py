import json
import sqlite3
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr

from app.config import get_settings


def _ddb_table():
    settings = get_settings()
    if not settings.dynamodb_table_name:
        return None
    dynamodb = boto3.resource("dynamodb", region_name=settings.dynamodb_region)
    return dynamodb.Table(settings.dynamodb_table_name)


def init_db() -> None:
    if _ddb_table() is not None:
        # DynamoDB table is expected to be provisioned by infra setup.
        return

    db_path = get_settings().database_path
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS event_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                job_id TEXT,
                source TEXT,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def save_event(
    event_type: str,
    payload: dict,
    *,
    status: str = "success",
    job_id: str | None = None,
    source: str | None = None,
) -> None:
    table = _ddb_table()
    if table is not None:
        item = {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "status": status,
            "job_id": job_id or "",
            "source": source or "",
            "payload_json": json.dumps(payload, ensure_ascii=True, default=str),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        table.put_item(Item=item)
        return

    db_path = get_settings().database_path
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            """
            INSERT INTO event_records (event_type, status, job_id, source, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                event_type,
                status,
                job_id,
                source,
                json.dumps(payload, ensure_ascii=True, default=str),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def list_events(limit: int = 50, event_type: str | None = None) -> list[dict]:
    table = _ddb_table()
    if table is not None:
        target_limit = max(1, min(limit, 500))
        scan_kwargs: dict = {}
        if event_type:
            scan_kwargs["FilterExpression"] = Attr("event_type").eq(event_type)

        items: list[dict] = []
        response = table.scan(**scan_kwargs)
        items.extend(response.get("Items", []))
        while "LastEvaluatedKey" in response and len(items) < 5000:
            response = table.scan(ExclusiveStartKey=response["LastEvaluatedKey"], **scan_kwargs)
            items.extend(response.get("Items", []))

        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        events: list[dict] = []
        for row in items[:target_limit]:
            payload_raw = row.get("payload_json") or "{}"
            try:
                payload = json.loads(payload_raw)
            except json.JSONDecodeError:
                payload = {"raw_payload": payload_raw}
            events.append(
                {
                    "id": int(abs(hash(row.get("id", ""))) % 2147483647),
                    "event_type": row.get("event_type", "unknown"),
                    "status": row.get("status", "unknown"),
                    "job_id": row.get("job_id") or None,
                    "source": row.get("source") or None,
                    "payload": payload,
                    "created_at": row.get("created_at", ""),
                }
            )
        return events

    db_path = get_settings().database_path
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        query = """
            SELECT id, event_type, status, job_id, source, payload_json, created_at
            FROM event_records
        """
        params: list[object] = []
        if event_type:
            query += " WHERE event_type = ?"
            params.append(event_type)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(max(1, min(limit, 500)))

        rows = conn.execute(query, params).fetchall()
        events: list[dict] = []
        for row in rows:
            payload_raw = row["payload_json"] or "{}"
            try:
                payload = json.loads(payload_raw)
            except json.JSONDecodeError:
                payload = {"raw_payload": payload_raw}

            events.append(
                {
                    "id": row["id"],
                    "event_type": row["event_type"],
                    "status": row["status"],
                    "job_id": row["job_id"],
                    "source": row["source"],
                    "payload": payload,
                    "created_at": row["created_at"],
                }
            )
        return events
    finally:
        conn.close()
