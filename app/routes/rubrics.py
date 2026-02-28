"""
Custom Rubric Builder Routes

Endpoints:
  POST   /api/rubrics       – Create a custom rubric
  GET    /api/rubrics       – List rubrics (optionally filtered by teacher_id)
  GET    /api/rubrics/{id}  – Get a single rubric
  DELETE /api/rubrics/{id}  – Delete a rubric
"""
import uuid

from fastapi import APIRouter, HTTPException

from app.schemas.response import RubricCreate, RubricResponse
from app.services.persistence import (
    save_rubric,
    get_rubric,
    list_rubrics,
    delete_rubric,
)

router = APIRouter(tags=["rubrics"])


@router.post("/api/rubrics", response_model=RubricResponse)
async def create_rubric(body: RubricCreate):
    rubric_id = uuid.uuid4().hex[:12]
    dims = [d.model_dump() for d in body.dimensions]
    save_rubric(rubric_id, body.name, dims, body.teacher_id)
    stored = get_rubric(rubric_id)
    if not stored:
        raise HTTPException(500, "Failed to save rubric")
    return RubricResponse(**stored)


@router.get("/api/rubrics", response_model=list[RubricResponse])
async def get_rubrics(teacher_id: str | None = None):
    rows = list_rubrics(teacher_id)
    return [RubricResponse(**r) for r in rows]


@router.get("/api/rubrics/{rubric_id}", response_model=RubricResponse)
async def get_rubric_by_id(rubric_id: str):
    found = get_rubric(rubric_id)
    if not found:
        raise HTTPException(404, "Rubric not found")
    return RubricResponse(**found)


@router.delete("/api/rubrics/{rubric_id}")
async def remove_rubric(rubric_id: str):
    ok = delete_rubric(rubric_id)
    if not ok:
        raise HTTPException(404, "Rubric not found")
    return {"status": "deleted"}
