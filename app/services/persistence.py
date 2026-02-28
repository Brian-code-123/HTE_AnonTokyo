"""
Persistence Layer — SQLite (local) + DynamoDB (production)

All entities share the same SQLite file (database_path from config).
DynamoDB uses a single-table design keyed by `pk`.
"""
from __future__ import annotations

import json
import secrets
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr

from app.config import get_settings


def _ddb_table():
    settings = get_settings()
    if not settings.dynamodb_table_name:
        return None
    dynamodb = boto3.resource("dynamodb", region_name=settings.dynamodb_region)
    return dynamodb.Table(settings.dynamodb_table_name)


# ── Utility ────────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_settings().database_path)
    conn.row_factory = sqlite3.Row
    return conn


# ── Schema bootstrap ───────────────────────────────────────────────────────────

def init_db() -> None:
    if _ddb_table() is not None:
        return  # DynamoDB provisioned by infra

    conn = _conn()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS event_records (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type  TEXT NOT NULL,
                status      TEXT NOT NULL,
                job_id      TEXT,
                source      TEXT,
                payload_json TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS teachers (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                subject     TEXT NOT NULL DEFAULT '',
                created_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analyses (
                id               TEXT PRIMARY KEY,
                teacher_id       TEXT NOT NULL,
                teacher_name     TEXT NOT NULL,
                lesson_title     TEXT NOT NULL,
                lesson_date      TEXT NOT NULL,
                overall_score    REAL NOT NULL DEFAULT 0,
                pace_score       REAL NOT NULL DEFAULT 0,
                body_score       REAL NOT NULL DEFAULT 0,
                clarity_score    REAL NOT NULL DEFAULT 0,
                engagement_score REAL NOT NULL DEFAULT 0,
                payload_json     TEXT NOT NULL DEFAULT '{}',
                created_at       TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_analyses_teacher ON analyses(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_analyses_date    ON analyses(lesson_date);

            CREATE TABLE IF NOT EXISTS rubrics (
                id              TEXT PRIMARY KEY,
                teacher_id      TEXT,
                name            TEXT NOT NULL,
                dimensions_json TEXT NOT NULL DEFAULT '[]',
                created_at      TEXT NOT NULL,
                updated_at      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS shares (
                share_token TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL,
                expires_at  TEXT NOT NULL,
                created_at  TEXT NOT NULL
            );
        """)
        conn.commit()
    finally:
        conn.close()


# ── event_records ──────────────────────────────────────────────────────────────

def save_event(
    event_type: str,
    payload: dict,
    *,
    status: str = "success",
    job_id: str | None = None,
    source: str | None = None,
) -> None:
    now = _now_iso()
    table = _ddb_table()
    if table is not None:
        table.put_item(Item={
            "pk": f"event#{uuid.uuid4()}",
            "event_type": event_type,
            "status": status,
            "job_id": job_id or "",
            "source": source or "",
            "payload_json": json.dumps(payload, default=str),
            "created_at": now,
        })
        return

    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO event_records (event_type, status, job_id, source, payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (event_type, status, job_id, source,
             json.dumps(payload, default=str), now),
        )
        conn.commit()
    finally:
        conn.close()


def list_events(limit: int = 50, event_type: str | None = None) -> list[dict]:
    table = _ddb_table()
    if table is not None:
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
        for row in items[:max(1, min(limit, 500))]:
            try:
                payload = json.loads(row.get("payload_json") or "{}")
            except json.JSONDecodeError:
                payload = {}
            events.append({
                "id": int(abs(hash(row.get("pk", ""))) % 2147483647),
                "event_type": row.get("event_type", ""),
                "status": row.get("status", ""),
                "job_id": row.get("job_id") or None,
                "source": row.get("source") or None,
                "payload": payload,
                "created_at": row.get("created_at", ""),
            })
        return events

    conn = _conn()
    try:
        query = "SELECT id, event_type, status, job_id, source, payload_json, created_at FROM event_records"
        params: list[object] = []
        if event_type:
            query += " WHERE event_type = ?"
            params.append(event_type)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(max(1, min(limit, 500)))
        rows = conn.execute(query, params).fetchall()
        events = []
        for row in rows:
            try:
                payload = json.loads(row["payload_json"] or "{}")
            except json.JSONDecodeError:
                payload = {}
            events.append({
                "id": row["id"],
                "event_type": row["event_type"],
                "status": row["status"],
                "job_id": row["job_id"],
                "source": row["source"],
                "payload": payload,
                "created_at": row["created_at"],
            })
        return events
    finally:
        conn.close()


# ── teachers ───────────────────────────────────────────────────────────────────

def save_teacher(teacher_id: str, name: str, subject: str = "") -> None:
    now = _now_iso()
    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO teachers (id, name, subject, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, subject=excluded.subject
            """,
            (teacher_id, name, subject, now),
        )
        conn.commit()
    finally:
        conn.close()


def list_teachers() -> list[dict]:
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT id, name, subject, created_at FROM teachers ORDER BY name"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_teacher(teacher_id: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT id, name, subject, created_at FROM teachers WHERE id = ?",
            (teacher_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


# ── analyses ───────────────────────────────────────────────────────────────────

def save_analysis(
    analysis_id: str,
    teacher_id: str,
    teacher_name: str,
    lesson_title: str,
    lesson_date: str,
    scores: dict[str, float],
    payload: dict[str, Any] | None = None,
) -> None:
    now = _now_iso()
    overall    = float(scores.get("overall",    0))
    pace       = float(scores.get("pace",       0))
    body       = float(scores.get("body",       0))
    clarity    = float(scores.get("clarity",    0))
    engagement = float(scores.get("engagement", 0))
    payload_s  = json.dumps(payload or {}, default=str)

    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO analyses
              (id, teacher_id, teacher_name, lesson_title, lesson_date,
               overall_score, pace_score, body_score, clarity_score,
               engagement_score, payload_json, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
              teacher_id=excluded.teacher_id,
              teacher_name=excluded.teacher_name,
              lesson_title=excluded.lesson_title,
              lesson_date=excluded.lesson_date,
              overall_score=excluded.overall_score,
              pace_score=excluded.pace_score,
              body_score=excluded.body_score,
              clarity_score=excluded.clarity_score,
              engagement_score=excluded.engagement_score,
              payload_json=excluded.payload_json
            """,
            (analysis_id, teacher_id, teacher_name, lesson_title, lesson_date,
             overall, pace, body, clarity, engagement, payload_s, now),
        )
        conn.commit()
    finally:
        conn.close()


def get_analysis(analysis_id: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["payload"] = json.loads(d.pop("payload_json", "{}") or "{}")
        except json.JSONDecodeError:
            d["payload"] = {}
        return d
    finally:
        conn.close()


def list_analyses(teacher_id: str | None = None, limit: int = 200) -> list[dict]:
    conn = _conn()
    try:
        cap = max(1, min(limit, 1000))
        if teacher_id:
            rows = conn.execute(
                """SELECT id, teacher_id, teacher_name, lesson_title, lesson_date,
                          overall_score, pace_score, body_score, clarity_score,
                          engagement_score, created_at
                   FROM analyses WHERE teacher_id = ?
                   ORDER BY lesson_date DESC, created_at DESC LIMIT ?""",
                (teacher_id, cap),
            ).fetchall()
        else:
            rows = conn.execute(
                """SELECT id, teacher_id, teacher_name, lesson_title, lesson_date,
                          overall_score, pace_score, body_score, clarity_score,
                          engagement_score, created_at
                   FROM analyses
                   ORDER BY lesson_date DESC, created_at DESC LIMIT ?""",
                (cap,),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_teacher_metrics(teacher_id: str) -> dict:
    """Return aggregated metrics + lesson history for the coaching agent."""
    conn = _conn()
    try:
        teacher_row = conn.execute(
            "SELECT id, name FROM teachers WHERE id = ?", (teacher_id,)
        ).fetchone()
        teacher_name = teacher_row["name"] if teacher_row else "Teacher"

        rows = conn.execute(
            """SELECT id, lesson_title, lesson_date, overall_score, pace_score,
                      body_score, clarity_score, engagement_score
               FROM analyses WHERE teacher_id = ?
               ORDER BY lesson_date ASC, created_at ASC""",
            (teacher_id,),
        ).fetchall()

        total = len(rows)
        if total == 0:
            return {
                "teacher_name":      teacher_name,
                "total_lessons":     0,
                "aggregated_metrics": {},
                "history":           [],
                "analyses":          [],
            }

        s_overall    = [float(r["overall_score"])    for r in rows]
        s_pace       = [float(r["pace_score"])       for r in rows]
        s_body       = [float(r["body_score"])       for r in rows]
        s_clarity    = [float(r["clarity_score"])    for r in rows]
        s_engagement = [float(r["engagement_score"]) for r in rows]

        def avg(lst: list[float]) -> float:
            return round(sum(lst) / len(lst), 1) if lst else 0.0

        def trend(lst: list[float]) -> float:
            n = len(lst)
            if n < 2:
                return 0.0
            mx = (n - 1) / 2.0
            my = sum(lst) / n
            num = sum((i - mx) * (lst[i] - my) for i in range(n))
            den = sum((i - mx) ** 2 for i in range(n))
            return round(num / den, 2) if den else 0.0

        best_idx  = s_overall.index(max(s_overall))
        worst_idx = s_overall.index(min(s_overall))
        dates = [str(r["lesson_date"])[:10] for r in rows]

        aggregated = {
            "avg_overall":      avg(s_overall),
            "avg_pace":         avg(s_pace),
            "avg_body":         avg(s_body),
            "avg_clarity":      avg(s_clarity),
            "avg_engagement":   avg(s_engagement),
            "trend_overall":    trend(s_overall),
            "trend_pace":       trend(s_pace),
            "trend_body":       trend(s_body),
            "trend_clarity":    trend(s_clarity),
            "trend_engagement": trend(s_engagement),
            "best_lesson_id":   rows[best_idx]["id"],
            "worst_lesson_id":  rows[worst_idx]["id"],
            "date_range":       [dates[0], dates[-1]] if dates else [],
        }

        history = [
            {
                "date":             str(r["lesson_date"])[:10],
                "title":            r["lesson_title"],
                "overall_score":    float(r["overall_score"]),
                "pace_score":       float(r["pace_score"]),
                "body_score":       float(r["body_score"]),
                "clarity_score":    float(r["clarity_score"]),
                "engagement_score": float(r["engagement_score"]),
            }
            for r in reversed(rows)
        ]

        analyses_list = [
            {
                "id":               r["id"],
                "teacher_id":       teacher_id,
                "teacher_name":     teacher_name,
                "lesson_title":     r["lesson_title"],
                "lesson_date":      str(r["lesson_date"])[:10],
                "overall_score":    float(r["overall_score"]),
                "pace_score":       float(r["pace_score"]),
                "body_score":       float(r["body_score"]),
                "clarity_score":    float(r["clarity_score"]),
                "engagement_score": float(r["engagement_score"]),
                "created_at":       "",
            }
            for r in rows
        ]

        return {
            "teacher_name":      teacher_name,
            "total_lessons":     total,
            "aggregated_metrics": aggregated,
            "history":           history,
            "analyses":          analyses_list,
        }
    finally:
        conn.close()


# ── rubrics ────────────────────────────────────────────────────────────────────

def save_rubric(
    rubric_id: str,
    name: str,
    dimensions: list[dict],
    teacher_id: str | None = None,
) -> None:
    now = _now_iso()
    dims_s = json.dumps(dimensions, default=str)
    conn = _conn()
    try:
        conn.execute(
            """
            INSERT INTO rubrics (id, teacher_id, name, dimensions_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              dimensions_json=excluded.dimensions_json,
              updated_at=excluded.updated_at
            """,
            (rubric_id, teacher_id, name, dims_s, now, now),
        )
        conn.commit()
    finally:
        conn.close()


def get_rubric(rubric_id: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT * FROM rubrics WHERE id = ?", (rubric_id,)
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        try:
            d["dimensions"] = json.loads(d.pop("dimensions_json", "[]") or "[]")
        except json.JSONDecodeError:
            d["dimensions"] = []
        return d
    finally:
        conn.close()


def list_rubrics(teacher_id: str | None = None) -> list[dict]:
    conn = _conn()
    try:
        if teacher_id:
            rows = conn.execute(
                "SELECT * FROM rubrics WHERE teacher_id = ? OR teacher_id IS NULL ORDER BY created_at DESC",
                (teacher_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM rubrics ORDER BY created_at DESC"
            ).fetchall()
        result = []
        for row in rows:
            d = dict(row)
            try:
                d["dimensions"] = json.loads(d.pop("dimensions_json", "[]") or "[]")
            except json.JSONDecodeError:
                d["dimensions"] = []
            result.append(d)
        return result
    finally:
        conn.close()


def delete_rubric(rubric_id: str) -> bool:
    conn = _conn()
    try:
        cur = conn.execute("DELETE FROM rubrics WHERE id = ?", (rubric_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ── shares ─────────────────────────────────────────────────────────────────────

def create_share(analysis_id: str, days: int = 30) -> dict:
    token = secrets.token_urlsafe(24)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
    now = _now_iso()
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO shares (share_token, analysis_id, expires_at, created_at) VALUES (?,?,?,?)",
            (token, analysis_id, expires_at, now),
        )
        conn.commit()
    finally:
        conn.close()
    return {"share_token": token, "expires_at": expires_at}


def get_share(token: str) -> dict | None:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT * FROM shares WHERE share_token = ?", (token,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
