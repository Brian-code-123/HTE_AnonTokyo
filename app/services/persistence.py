import json
import sqlite3
from datetime import datetime, timezone

from app.config import get_settings


def init_db() -> None:
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
