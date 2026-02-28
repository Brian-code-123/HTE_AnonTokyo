"""
AI Coaching Route — generates personalised improvement plans
based on teacher trend data from the persistence layer.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


# ── Coaching Logic (rule-based, no LLM required) ─────────────────────────────

_AREA_MAP = {
    "overall":    ("Overall Performance", "avg_overall",    "trend_overall"),
    "pace":       ("Pacing & Timing",     "avg_pace",       "trend_pace"),
    "body":       ("Body Language",        "avg_body",       "trend_body"),
    "clarity":    ("Clarity of Explanation","avg_clarity",   "trend_clarity"),
    "engagement": ("Student Engagement",   "avg_engagement", "trend_engagement"),
}

_TIPS: dict[str, list[str]] = {
    "pace": [
        "Practice with a timer: aim for 2-3 min per slide / concept block.",
        "Record yourself and count filler words — aim to reduce by 20 % each week.",
        "Insert deliberate pauses after key points to let students absorb.",
        "Use a pacing cue card next to your screen.",
    ],
    "body": [
        "Maintain eye contact with different zones of the room every 15 s.",
        "Use open-palm gestures instead of crossed arms.",
        "Move purposefully between areas of the room — avoid pacing.",
        "Film one lesson per week and self-review posture / gestures.",
    ],
    "clarity": [
        "Start each topic with a one-sentence learning objective.",
        "Use analogies and real-world examples to anchor abstract ideas.",
        "Summarise key takeaways at the end of each section.",
        "Ask students to rephrase concepts in their own words.",
    ],
    "engagement": [
        "Insert a quick poll or question every 5-7 minutes.",
        "Use a 'think-pair-share' activity for complex topics.",
        "Call on students by name to maintain attention.",
        "Incorporate short multimedia clips to vary the medium.",
    ],
    "overall": [
        "Set one measurable teaching goal per week and review at end of week.",
        "Seek peer observation and constructive feedback once a month.",
        "Keep a teaching journal noting what worked and what to improve.",
        "Celebrate small wins to maintain motivation.",
    ],
}


def _priority(avg: float, trend: float) -> str:
    # avg is on 0-100 scale
    if avg < 60 and trend <= 0:
        return "high"
    if avg < 70 or trend < -6:
        return "high"
    if avg < 80:
        return "medium"
    return "low"


def _build_suggestion(area_key: str, avg: float, trend: float) -> CoachingSuggestion:
    label, _, _ = _AREA_MAP[area_key]
    p = _priority(avg, trend)

    if trend > 0.3:
        direction = f"improving (+{trend})"
    elif trend < -0.3:
        direction = f"declining ({trend})"
    else:
        direction = "stable"

    if p == "high":
        summary = (
            f"Your {label.lower()} score is {avg}/100 and is {direction}. "
            "This area needs focused attention. Consider the action items below."
        )
    elif p == "medium":
        summary = (
            f"Your {label.lower()} score is {avg}/100 ({direction}). "
            "There's room for growth — try incorporating one new strategy per week."
        )
    else:
        summary = (
            f"Great work on {label.lower()}! Your score is {avg}/100 ({direction}). "
            "Keep it up and continue refining."
        )

    tips = _TIPS.get(area_key, _TIPS["overall"])
    # Pick 2-3 tips based on priority
    n = 3 if p == "high" else 2
    action_items = tips[:n]

    return CoachingSuggestion(
        area=label,
        current_score=avg,
        trend=trend,
        priority=p,
        suggestion=summary,
        action_items=action_items,
    )


def _build_coaching_plan(teacher_name: str, metrics: dict) -> CoachingPlan:
    from datetime import datetime, timezone

    agg = metrics.get("aggregated_metrics", {})
    if not agg:
        return CoachingPlan(
            teacher_name=teacher_name,
            generated_at=datetime.now(timezone.utc).isoformat(),
            overall_summary="Not enough data yet. Record at least one lesson analysis to receive coaching.",
            suggestions=[],
        )

    suggestions: list[CoachingSuggestion] = []
    for key, (_, avg_key, trend_key) in _AREA_MAP.items():
        if key == "overall":
            continue  # handle overall separately
        avg = agg.get(avg_key, 0)
        trend = agg.get(trend_key, 0)
        suggestions.append(_build_suggestion(key, avg, trend))

    # Sort by priority: high → medium → low
    order = {"high": 0, "medium": 1, "low": 2}
    suggestions.sort(key=lambda s: order.get(s.priority, 3))

    # Build overall summary
    total_lessons = metrics.get("total_lessons", 0)
    avg_overall = agg.get("avg_overall", 0)
    trend_overall = agg.get("trend_overall", 0)
    high_count = sum(1 for s in suggestions if s.priority == "high")

    if high_count == 0:
        overall_text = (
            f"Excellent! Across {total_lessons} lesson(s) your overall score is {avg_overall}/100. "
            "All areas are in good shape. Keep refining your strengths!"
        )
    else:
        areas = ", ".join(s.area for s in suggestions if s.priority == "high")
        overall_text = (
            f"Based on {total_lessons} lesson(s), your overall score is {avg_overall}/100 "
            f"(trend: {'+' if trend_overall > 0 else ''}{trend_overall}). "
            f"Priority areas to focus on: {areas}."
        )

    return CoachingPlan(
        teacher_name=teacher_name,
        generated_at=datetime.now(timezone.utc).isoformat(),
        overall_summary=overall_text,
        suggestions=suggestions,
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/coaching/suggestions", response_model=CoachingPlan)
async def get_coaching_suggestions(body: CoachingRequest):
    metrics = get_teacher_metrics(body.teacher_id)
    if metrics.get("total_lessons", 0) == 0:
        # Try to get teacher name from list
        teachers = list_teachers()
        name = next((t["name"] for t in teachers if t["id"] == body.teacher_id), "Unknown")
        return _build_coaching_plan(name, metrics)

    teacher_name = metrics.get("teacher_name", "Teacher")
    return _build_coaching_plan(teacher_name, metrics)
