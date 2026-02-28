"""
Teacher Management & Timeline Routes

Endpoints:
  POST /api/teachers           – Create / register a teacher
  GET  /api/teachers           – List all teachers
  GET  /api/teachers/{id}/timeline – Longitudinal metrics & trend data
  GET  /api/teachers/{id}/analyses – List analyses for a teacher
"""
from fastapi import APIRouter, HTTPException

from app.schemas.response import (
    TeacherCreate,
    TeacherResponse,
    AnalysisSummary,
    TeacherTimelineResponse,
    AggregatedMetrics,
)
from app.services.persistence import (
    save_teacher,
    list_teachers,
    list_analyses,
    get_teacher_metrics,
)

router = APIRouter(tags=["teachers"])


@router.post("/api/teachers", response_model=TeacherResponse)
async def create_teacher(body: TeacherCreate):
    save_teacher(body.id, body.name, body.subject)
    return TeacherResponse(
        id=body.id,
        name=body.name,
        subject=body.subject,
        created_at="",
    )


@router.get("/api/teachers", response_model=list[TeacherResponse])
async def get_teachers():
    rows = list_teachers()
    return [TeacherResponse(**r) for r in rows]


@router.get("/api/teachers/{teacher_id}/timeline", response_model=TeacherTimelineResponse)
async def teacher_timeline(teacher_id: str):
    metrics = get_teacher_metrics(teacher_id)
    if metrics["total_lessons"] == 0:
        raise HTTPException(404, "No analyses found for this teacher")
    analyses = [AnalysisSummary(**a, teacher_id=teacher_id,
                                 teacher_name=metrics["teacher_name"],
                                 created_at="") for a in metrics["analyses"]]
    agg = AggregatedMetrics(**metrics["aggregated_metrics"]) if metrics.get("aggregated_metrics") else None
    return TeacherTimelineResponse(
        teacher_name=metrics["teacher_name"],
        total_lessons=metrics["total_lessons"],
        analyses=analyses,
        aggregated_metrics=agg,
    )


@router.get("/api/teachers/{teacher_id}/analyses", response_model=list[AnalysisSummary])
async def teacher_analyses(teacher_id: str, limit: int = 50):
    rows = list_analyses(teacher_id=teacher_id, limit=limit)
    return [AnalysisSummary(**r) for r in rows]
