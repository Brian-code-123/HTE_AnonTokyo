"""
AI Coaching Route — ASI One Agent
===================================
Generates personalised, evidence-based teaching improvement plans by
feeding real lesson metrics into the ASI One (asi1-mini) AI agent.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.asi_one import async_chat_completion, COACHING_SYSTEM_PROMPT
from app.services.persistence import get_teacher_metrics, list_teachers

router = APIRouter(prefix="/api", tags=["coaching"])


# ── Request / Response Schemas ────────────────────────────────────────────────

class CoachingRequest(BaseModel):
    teacher_id: str


class CoachingSuggestion(BaseModel):
    area: str
    current_score: float
    trend: float
    priority: str
    suggestion: str
    action_items: list[str]


class CoachingPlan(BaseModel):
    teacher_name: str
    generated_at: str
    overall_summary: str
    suggestions: list[CoachingSuggestion]
    powered_by: str = "ASI One asi1-mini"


# ── Prompt Helpers ────────────────────────────────────────────────────────────

def _build_metrics_summary(teacher_name: str, metrics: dict[str, Any]) -> str:
    """Convert raw DB metrics into a readable summary for the AI agent."""
    agg = metrics.get("aggregated_metrics", {})
    history = metrics.get("history", [])
    total = metrics.get("total_lessons", 0)

    if not agg or total == 0:
        return f"Teacher: {teacher_name}\nTotal lessons recorded: 0\nNo data available yet."

    lines = [
        f"Teacher: {teacher_name}",
        f"Total lessons analysed: {total}",
        "",
        "## Aggregated Scores (0–100 scale)",
        f"- Overall:       {agg.get('avg_overall', 'N/A')}/100  (trend: {agg.get('trend_overall', 0):+.1f})",
        f"- Pace:          {agg.get('avg_pace', 'N/A')}/100  (trend: {agg.get('trend_pace', 0):+.1f})",
        f"- Body Language: {agg.get('avg_body', 'N/A')}/100  (trend: {agg.get('trend_body', 0):+.1f})",
        f"- Clarity:       {agg.get('avg_clarity', 'N/A')}/100  (trend: {agg.get('trend_clarity', 0):+.1f})",
        f"- Engagement:    {agg.get('avg_engagement', 'N/A')}/100  (trend: {agg.get('trend_engagement', 0):+.1f})",
    ]

    if history:
        lines += ["", "## Recent Lesson History (newest first, max 5)"]
        for lesson in history[:5]:
            date = str(lesson.get("date", ""))[:10]
            title = lesson.get("title", "Untitled")
            lines.append(
                f"- {date} | {title} | "
                f"Overall: {lesson.get('overall_score', 'N/A')} | "
                f"Pace: {lesson.get('pace_score', 'N/A')} | "
                f"Body: {lesson.get('body_score', 'N/A')} | "
                f"Clarity: {lesson.get('clarity_score', 'N/A')} | "
                f"Engagement: {lesson.get('engagement_score', 'N/A')}"
            )

    return "\n".join(lines)


COACHING_JSON_SCHEMA = """
{
  "overall_summary": "<2-3 sentence summary of performance and key focus areas>",
  "suggestions": [
    {
      "area": "<area name e.g. Pacing & Timing>",
      "current_score": <number 0-100>,
      "trend": <number, positive=improving, negative=declining>,
      "priority": "<high|medium|low>",
      "suggestion": "<2-3 sentence personalised analysis of this area>",
      "action_items": [
        "<concrete next-lesson action 1>",
        "<concrete next-lesson action 2>",
        "<concrete next-lesson action 3 if high priority>"
      ]
    }
  ]
}

Rules:
- priority high: score < 65 OR trend < -5
- priority medium: score 65-79 OR slightly negative trend
- priority low: score >= 80 AND stable/improving
- Include suggestions for: Pacing & Timing, Body Language, Clarity of Explanation, Student Engagement
- Sort final array: high → medium → low
"""

_JSON_RE = re.compile(r"```(?:json)?\s*([\s\S]+?)\s*```|(\{[\s\S]+\})", re.MULTILINE)


def _parse_coaching_json(raw: str) -> dict:
    m = _JSON_RE.search(raw)
    if m:
        candidate = m.group(1) or m.group(2)
        return json.loads(candidate)
    return json.loads(raw)


def _fallback_plan(teacher_name: str) -> CoachingPlan:
    return CoachingPlan(
        teacher_name=teacher_name,
        generated_at=datetime.now(timezone.utc).isoformat(),
        overall_summary=(
            "Not enough data yet. Record at least one lesson analysis to receive "
            "AI-powered coaching from ASI One."
        ),
        suggestions=[],
        powered_by="ASI One asi1-mini",
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/coaching/suggestions", response_model=CoachingPlan)
async def get_coaching_suggestions(body: CoachingRequest):
    metrics = get_teacher_metrics(body.teacher_id)
    teacher_name = metrics.get("teacher_name") or "Teacher"

    # Resolve name from teacher list if not stored in metrics
    if teacher_name == "Teacher":
        teachers = list_teachers()
        teacher_name = next(
            (t["name"] for t in teachers if t["id"] == body.teacher_id),
            "Teacher",
        )

    if metrics.get("total_lessons", 0) == 0:
        return _fallback_plan(teacher_name)

    metrics_summary = _build_metrics_summary(teacher_name, metrics)

    user_prompt = (
        "Here is the performance data for a teacher. "
        "Analyse it and produce a coaching plan in exactly the JSON schema below.\n\n"
        f"=== TEACHER DATA ===\n{metrics_summary}\n\n"
        f"=== REQUIRED JSON SCHEMA ===\n{COACHING_JSON_SCHEMA}\n\n"
        "Respond with ONLY the JSON object. No markdown fences, no extra text — just valid JSON."
    )

    messages = [
        {"role": "system", "content": COACHING_SYSTEM_PROMPT},
        {"role": "user",   "content": user_prompt},
    ]

    try:
        raw = await async_chat_completion(messages, temperature=0.5, max_tokens=2048)
        data = _parse_coaching_json(raw)

        suggestions = [
            CoachingSuggestion(
                area=s.get("area", "General"),
                current_score=float(s.get("current_score", 0)),
                trend=float(s.get("trend", 0)),
                priority=s.get("priority", "medium"),
                suggestion=s.get("suggestion", ""),
                action_items=s.get("action_items", []),
            )
            for s in data.get("suggestions", [])
        ]

        return CoachingPlan(
            teacher_name=teacher_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
            overall_summary=data.get("overall_summary", ""),
            suggestions=suggestions,
            powered_by="ASI One asi1-mini",
        )

    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"ASI One coaching agent error: {exc}")
