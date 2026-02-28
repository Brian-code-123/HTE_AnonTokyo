"""
Demo / Seed Data Route — populates the database with sample teachers,
analyses, and rubrics so new pages have visible content.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.persistence import (
    save_teacher,
    save_analysis,
    save_rubric,
    list_teachers,
    list_analyses,
    list_rubrics,
)

router = APIRouter(prefix="/api", tags=["seed"])


class SeedResult(BaseModel):
    teachers_created: int
    analyses_created: int
    rubrics_created: int
    message: str


_DEMO_TEACHERS = [
    ("demo-teacher-1", "Alice Chen", "Mathematics"),
    ("demo-teacher-2", "Bob Williams", "Science"),
    ("demo-teacher-3", "Clara Kim", "English Literature"),
]

_DEMO_ANALYSES = [
    # (teacher_id, title, date, overall, pace, body, clarity, engagement)  — all 0-100 scale
    ("demo-teacher-1", "Algebra Basics — Week 1",     "2024-09-02", 64, 60, 56, 70, 68),
    ("demo-teacher-1", "Quadratics Intro — Week 3",   "2024-09-16", 70, 66, 62, 76, 72),
    ("demo-teacher-1", "Functions & Graphs — Week 5", "2024-10-01", 76, 72, 70, 80, 75),
    ("demo-teacher-1", "Trigonometry — Week 7",       "2024-10-14", 82, 76, 74, 86, 82),
    ("demo-teacher-1", "Calculus Preview — Week 9",   "2024-10-28", 88, 84, 80, 90, 86),

    ("demo-teacher-2", "Cells & Organisms — Week 1",  "2024-09-03", 76, 70, 64, 80, 78),
    ("demo-teacher-2", "Genetics Lab — Week 3",        "2024-09-17", 68, 60, 70, 72, 64),
    ("demo-teacher-2", "Ecology Fieldwork — Week 5",   "2024-10-02", 80, 74, 84, 78, 82),
    ("demo-teacher-2", "Chemistry Basics — Week 7",    "2024-10-15", 84, 80, 76, 86, 80),

    ("demo-teacher-3", "Poetry Analysis — Week 1",      "2024-09-04", 80, 76, 82, 84, 78),
    ("demo-teacher-3", "Shakespeare Deep Dive — Week 3", "2024-09-18", 72, 64, 68, 76, 70),
    ("demo-teacher-3", "Essay Workshop — Week 5",       "2024-10-03", 86, 80, 82, 88, 84),
]

_DEMO_RUBRICS = [
    {
        "name": "Standard Teaching Rubric",
        "dimensions": [
            {"name": "Clarity of Explanation", "weight": 1.2, "description": "How well concepts are explained", "max_score": 5},
            {"name": "Student Engagement", "weight": 1.0, "description": "Interaction and engagement techniques", "max_score": 5},
            {"name": "Pacing", "weight": 0.8, "description": "Appropriate speed and timing", "max_score": 5},
            {"name": "Body Language", "weight": 0.8, "description": "Posture, gestures, eye contact", "max_score": 5},
            {"name": "Content Accuracy", "weight": 1.2, "description": "Correctness of subject matter", "max_score": 5},
        ],
    },
    {
        "name": "Presentation Skills Rubric",
        "dimensions": [
            {"name": "Voice Modulation", "weight": 1.0, "description": "Volume, tone, and pitch variation", "max_score": 5},
            {"name": "Visual Aids Usage", "weight": 1.0, "description": "Effective use of slides/props", "max_score": 5},
            {"name": "Audience Engagement", "weight": 1.2, "description": "Questions, interaction, responsive to feedback", "max_score": 5},
            {"name": "Time Management", "weight": 0.8, "description": "Staying within allocated time", "max_score": 5},
        ],
    },
]


@router.post("/seed-demo", response_model=SeedResult)
async def seed_demo_data():
    """Populate the database with demo teachers, analyses and rubrics."""
    t_count = 0
    a_count = 0
    r_count = 0

    # Teachers
    existing_teachers = {t["id"] for t in list_teachers()}
    for tid, name, subject in _DEMO_TEACHERS:
        if tid not in existing_teachers:
            save_teacher(tid, name, subject)
            t_count += 1

    # Analyses
    existing_analyses = {a["id"] for a in list_analyses()}
    for tid, title, date, overall, pace, body, clarity, engagement in _DEMO_ANALYSES:
        aid = f"demo-{tid}-{date}"
        if aid not in existing_analyses:
            teacher_name = next((n for i, n, _ in _DEMO_TEACHERS if i == tid), "")
            save_analysis(
                analysis_id=aid,
                teacher_id=tid,
                teacher_name=teacher_name,
                lesson_title=title,
                lesson_date=date,
                scores={
                    "overall": overall,
                    "pace": pace,
                    "body": body,
                    "clarity": clarity,
                    "engagement": engagement,
                },
                payload={
                    "demo": True,
                    "transcript_excerpt": f"This is a demo transcript for '{title}'.",
                },
            )
            a_count += 1

    # Rubrics
    existing_rubrics = {r["name"] for r in list_rubrics()}
    for rub in _DEMO_RUBRICS:
        if rub["name"] not in existing_rubrics:
            save_rubric(
                rubric_id=f"demo-rubric-{uuid.uuid4().hex[:8]}",
                name=rub["name"],
                dimensions=rub["dimensions"],
                teacher_id=None,
            )
            r_count += 1

    return SeedResult(
        teachers_created=t_count,
        analyses_created=a_count,
        rubrics_created=r_count,
        message=f"Seeded {t_count} teachers, {a_count} analyses, {r_count} rubrics.",
    )
