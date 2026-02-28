import json
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

from app.config import get_settings


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(get_settings().database_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    conn = _get_conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS event_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                status TEXT NOT NULL,
                job_id TEXT,
                source TEXT,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analyses (
                id TEXT PRIMARY KEY,
                teacher_id TEXT,
                teacher_name TEXT DEFAULT '',
                lesson_title TEXT DEFAULT '',
                lesson_date TEXT,
                overall_score REAL DEFAULT 0,
                pace_score REAL DEFAULT 0,
                body_score REAL DEFAULT 0,
                clarity_score REAL DEFAULT 0,
                engagement_score REAL DEFAULT 0,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS teachers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                subject TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS rubrics (
                id TEXT PRIMARY KEY,
                teacher_id TEXT,
                name TEXT NOT NULL,
                dimensions_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS analysis_shares (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL,
                share_token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                access_count INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_analyses_teacher ON analyses(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_shares_token ON analysis_shares(share_token);
            CREATE INDEX IF NOT EXISTS idx_rubrics_teacher ON rubrics(teacher_id);
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
    conn = _get_conn()
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
    conn = _get_conn()
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


# ── Analysis CRUD ─────────────────────────────────────────────────────────────

def save_analysis(analysis_id: str, teacher_id: str, teacher_name: str,
                  lesson_title: str, lesson_date: str, scores: dict,
                  payload: dict) -> None:
    conn = _get_conn()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO analyses
            (id, teacher_id, teacher_name, lesson_title, lesson_date,
             overall_score, pace_score, body_score, clarity_score, engagement_score,
             payload_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                analysis_id, teacher_id, teacher_name, lesson_title, lesson_date,
                scores.get("overall", 0), scores.get("pace", 0),
                scores.get("body", 0), scores.get("clarity", 0),
                scores.get("engagement", 0),
                json.dumps(payload, ensure_ascii=True, default=str),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def get_analysis(analysis_id: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
        if not row:
            return None
        payload = json.loads(row["payload_json"] or "{}")
        return {
            "id": row["id"], "teacher_id": row["teacher_id"],
            "teacher_name": row["teacher_name"], "lesson_title": row["lesson_title"],
            "lesson_date": row["lesson_date"],
            "overall_score": row["overall_score"], "pace_score": row["pace_score"],
            "body_score": row["body_score"], "clarity_score": row["clarity_score"],
            "engagement_score": row["engagement_score"],
            "payload": payload, "created_at": row["created_at"],
        }
    finally:
        conn.close()


def list_analyses(teacher_id: str | None = None, limit: int = 50) -> list[dict]:
    conn = _get_conn()
    try:
        q = "SELECT * FROM analyses"
        params: list[object] = []
        if teacher_id:
            q += " WHERE teacher_id = ?"
            params.append(teacher_id)
        q += " ORDER BY lesson_date DESC LIMIT ?"
        params.append(limit)
        rows = conn.execute(q, params).fetchall()
        results = []
        for r in rows:
            results.append({
                "id": r["id"], "teacher_id": r["teacher_id"],
                "teacher_name": r["teacher_name"], "lesson_title": r["lesson_title"],
                "lesson_date": r["lesson_date"],
                "overall_score": r["overall_score"], "pace_score": r["pace_score"],
                "body_score": r["body_score"], "clarity_score": r["clarity_score"],
                "engagement_score": r["engagement_score"],
                "created_at": r["created_at"],
            })
        return results
    finally:
        conn.close()


# ── Teacher CRUD ──────────────────────────────────────────────────────────────

def save_teacher(teacher_id: str, name: str, subject: str = "") -> None:
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT OR IGNORE INTO teachers (id, name, subject, created_at) VALUES (?, ?, ?, ?)",
            (teacher_id, name, subject, datetime.now(timezone.utc).isoformat()),
        )
        conn.commit()
    finally:
        conn.close()


def list_teachers() -> list[dict]:
    conn = _get_conn()
    try:
        rows = conn.execute("SELECT * FROM teachers ORDER BY name").fetchall()
        return [{"id": r["id"], "name": r["name"], "subject": r["subject"],
                 "created_at": r["created_at"]} for r in rows]
    finally:
        conn.close()


# ── Rubric CRUD ───────────────────────────────────────────────────────────────

def save_rubric(rubric_id: str, name: str, dimensions: list,
                teacher_id: str | None = None) -> None:
    now = datetime.now(timezone.utc).isoformat()
    conn = _get_conn()
    try:
        conn.execute(
            """
            INSERT OR REPLACE INTO rubrics (id, teacher_id, name, dimensions_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (rubric_id, teacher_id, name,
             json.dumps(dimensions, ensure_ascii=False), now, now),
        )
        conn.commit()
    finally:
        conn.close()


def get_rubric(rubric_id: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM rubrics WHERE id = ?", (rubric_id,)).fetchone()
        if not row:
            return None
        return {
            "id": row["id"], "teacher_id": row["teacher_id"],
            "name": row["name"],
            "dimensions": json.loads(row["dimensions_json"] or "[]"),
            "created_at": row["created_at"], "updated_at": row["updated_at"],
        }
    finally:
        conn.close()


def list_rubrics(teacher_id: str | None = None) -> list[dict]:
    conn = _get_conn()
    try:
        if teacher_id:
            rows = conn.execute(
                "SELECT * FROM rubrics WHERE teacher_id = ? OR teacher_id IS NULL ORDER BY updated_at DESC",
                (teacher_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM rubrics ORDER BY updated_at DESC").fetchall()
        return [{
            "id": r["id"], "teacher_id": r["teacher_id"], "name": r["name"],
            "dimensions": json.loads(r["dimensions_json"] or "[]"),
            "created_at": r["created_at"], "updated_at": r["updated_at"],
        } for r in rows]
    finally:
        conn.close()


def delete_rubric(rubric_id: str) -> bool:
    conn = _get_conn()
    try:
        cur = conn.execute("DELETE FROM rubrics WHERE id = ?", (rubric_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


# ── Share Links ───────────────────────────────────────────────────────────────

def create_share(analysis_id: str, days: int = 30) -> dict:
    share_id = secrets.token_urlsafe(8)
    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=days)
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO analysis_shares (id, analysis_id, share_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
            (share_id, analysis_id, token, now.isoformat(), expires.isoformat()),
        )
        conn.commit()
    finally:
        conn.close()
    return {"share_token": token, "expires_at": expires.isoformat()}


def get_share(token: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM analysis_shares WHERE share_token = ?", (token,)
        ).fetchone()
        if not row:
            return None
        # bump access count
        conn.execute(
            "UPDATE analysis_shares SET access_count = access_count + 1 WHERE id = ?",
            (row["id"],),
        )
        conn.commit()
        return {
            "analysis_id": row["analysis_id"],
            "expires_at": row["expires_at"],
            "access_count": row["access_count"],
        }
    finally:
        conn.close()


# ── Teacher Metrics (aggregation) ─────────────────────────────────────────────

def get_teacher_metrics(teacher_id: str) -> dict:
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM analyses WHERE teacher_id = ? ORDER BY lesson_date ASC",
            (teacher_id,),
        ).fetchall()
        if not rows:
            return {"total_lessons": 0, "analyses": [], "aggregated_metrics": {}}

        analyses = []
        for r in rows:
            analyses.append({
                "id": r["id"], "lesson_title": r["lesson_title"],
                "lesson_date": r["lesson_date"],
                "overall_score": r["overall_score"], "pace_score": r["pace_score"],
                "body_score": r["body_score"], "clarity_score": r["clarity_score"],
                "engagement_score": r["engagement_score"],
            })

        n = len(analyses)
        avg = lambda key: round(sum(a[key] for a in analyses) / n, 1) if n else 0

        # trend: compare first half vs second half
        half = max(1, n // 2)
        first_half = analyses[:half]
        second_half = analyses[half:]
        def trend(key: str) -> float:
            a1 = sum(a[key] for a in first_half) / len(first_half) if first_half else 0
            a2 = sum(a[key] for a in second_half) / len(second_half) if second_half else 0
            return round(a2 - a1, 1)

        best = max(analyses, key=lambda a: a["overall_score"])
        worst = min(analyses, key=lambda a: a["overall_score"])

        return {
            "teacher_name": rows[0]["teacher_name"],
            "total_lessons": n,
            "analyses": analyses,
            "aggregated_metrics": {
                "avg_overall": avg("overall_score"),
                "avg_pace": avg("pace_score"),
                "avg_body": avg("body_score"),
                "avg_clarity": avg("clarity_score"),
                "avg_engagement": avg("engagement_score"),
                "trend_overall": trend("overall_score"),
                "trend_pace": trend("pace_score"),
                "trend_body": trend("body_score"),
                "trend_clarity": trend("clarity_score"),
                "trend_engagement": trend("engagement_score"),
                "best_lesson_id": best["id"],
                "worst_lesson_id": worst["id"],
                "date_range": [analyses[0]["lesson_date"], analyses[-1]["lesson_date"]] if n else [],
            },
        }
    finally:
        conn.close()
