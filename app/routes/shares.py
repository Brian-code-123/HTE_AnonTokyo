"""
Shareable Analysis Links Routes

Endpoints:
  POST /api/shares              – Create a share link for an analysis
  GET  /api/shares/{token}      – Retrieve shared analysis by token
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from app.schemas.response import (
    ShareCreateRequest,
    ShareCreateResponse,
    SharedAnalysisResponse,
    AnalysisDetail,
)
from app.services.persistence import create_share, get_share, get_analysis

router = APIRouter(tags=["shares"])


@router.post("/api/shares", response_model=ShareCreateResponse)
async def create_share_link(body: ShareCreateRequest, request: Request):
    # Verify analysis exists
    analysis = get_analysis(body.analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    result = create_share(body.analysis_id, body.days)
    base = str(request.base_url).rstrip("/")
    share_url = f"{base}/shared/{result['share_token']}"
    return ShareCreateResponse(
        share_token=result["share_token"],
        expires_at=result["expires_at"],
        share_url=share_url,
    )


@router.get("/api/shares/{token}", response_model=SharedAnalysisResponse)
async def get_shared_analysis(token: str):
    share = get_share(token)
    if not share:
        raise HTTPException(404, "Share link not found or expired")

    # Check expiry
    expires = datetime.fromisoformat(share["expires_at"])
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(410, "Share link has expired")

    analysis = get_analysis(share["analysis_id"])
    if not analysis:
        raise HTTPException(404, "Analysis not found")

    return SharedAnalysisResponse(
        analysis=AnalysisDetail(**analysis),
        share_info=share,
    )
