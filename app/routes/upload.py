"""S3 presigned URL for large file uploads (avoids Lambda 6 MB limit)."""
import logging

from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.services.s3_upload import get_presigned_put_url

logger = logging.getLogger(__name__)

router = APIRouter(tags=["upload"])


@router.get("/api/upload-url")
async def upload_url(
    filename: str = Query(..., description="Original filename (used for extension and Content-Type hint)"),
) -> dict:
    """Return a presigned PUT URL and S3 key for direct upload.

    Client should:
    1. PUT the file to the returned upload_url (binary body, Content-Type: video/* or application/octet-stream).
    2. Call POST /api/full-analysis or POST /api/analyze with form field s3_key set to the returned key.
    """
    settings = get_settings()
    if not settings.s3_upload_bucket:
        raise HTTPException(
            status_code=503,
            detail="S3 upload not configured. Set S3_UPLOAD_BUCKET and ensure Lambda has S3 PutObject/GetObject.",
        )
    try:
        # Prefer video/audio types for common extensions
        content_type = "application/octet-stream"
        if filename.lower().endswith((".mp4", ".mov", ".mkv", ".avi", ".webm")):
            content_type = "video/mp4"
        elif filename.lower().endswith((".mp3", ".wav", ".m4a", ".ogg", ".flac")):
            content_type = "audio/mpeg"
        url, key = get_presigned_put_url(settings, filename, content_type)
        return {"upload_url": url, "s3_key": key}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Failed to generate presigned URL")
        raise HTTPException(status_code=500, detail="Failed to generate upload URL")
