"""
Teacher feedback endpoint — sends all analysis context to Minimax LLM
and returns actionable, personalized feedback.

  POST /api/feedback
"""
import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.config import get_settings
from app.schemas.response import FeedbackRequest, FeedbackResponse
from app.services.minimax_feedback import MinimaxFeedbackService
from app.services.persistence import save_event
from app.services.session_stats import stats as session_stats

logger = logging.getLogger(__name__)

router = APIRouter(tags=["feedback"])


@router.post("/api/feedback", response_model=FeedbackResponse)
async def generate_feedback(body: FeedbackRequest) -> FeedbackResponse:
    """Generate teacher feedback from analysis data via Minimax LLM.

    Accepts any combination of transcript, body language report, and rubric
    evaluation. At least one must be provided.
    """
    settings = get_settings()

    if not settings.minimax_api_key:
        raise HTTPException(
            status_code=500,
            detail="MINIMAX_API_KEY not configured.",
        )

    if not any([body.transcript, body.body_language_report,
                body.rubric_evaluation, body.additional_context]):
        raise HTTPException(
            status_code=400,
            detail="At least one analysis input is required.",
        )

    try:
        svc = MinimaxFeedbackService(settings)
        loop = asyncio.get_running_loop()
        feedback = await loop.run_in_executor(
            None,
            svc.generate_feedback,
            body.transcript,
            body.body_language_report,
            body.rubric_evaluation,
            body.additional_context,
        )

        session_stats.feedback_generated += 1
        response = FeedbackResponse(
            feedback=feedback,
            model=settings.minimax_model,
        )
        save_event(
            "feedback",
            {
                "model": settings.minimax_model,
                "feedback_chars": len(feedback),
                "has_transcript": bool(body.transcript),
                "has_body_language_report": bool(body.body_language_report),
                "has_rubric_evaluation": bool(body.rubric_evaluation),
                "has_additional_context": bool(body.additional_context),
            },
            source="feedback",
        )
        return response

    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Minimax feedback error: %s", exc)
        raise HTTPException(status_code=502, detail=f"Feedback generation failed: {exc}")
