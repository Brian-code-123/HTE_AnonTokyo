"""S3 presigned URLs for large file uploads.

When deployed behind Lambda (6 MB request limit), the client uploads
directly to S3 via a presigned PUT URL, then sends the S3 key to the API.
The backend downloads from S3 and processes the file.
"""
from __future__ import annotations

import logging
import uuid
from pathlib import Path

import boto3

from app.config import Settings

logger = logging.getLogger(__name__)

# Presigned URL expiry (seconds)
PRESIGN_EXPIRES_IN = 900  # 15 min


def _s3_client(settings: Settings):
    kwargs = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **kwargs)


def get_presigned_put_url(
    settings: Settings,
    filename: str,
    content_type: str = "application/octet-stream",
) -> tuple[str, str]:
    """Generate a presigned PUT URL for client upload.

    Returns (upload_url, s3_key). The client should PUT the file to upload_url
    with Content-Type header, then pass s3_key to the analysis endpoint.
    """
    bucket = settings.s3_upload_bucket
    if not bucket:
        raise ValueError("S3 upload bucket not configured (S3_UPLOAD_BUCKET)")

    ext = Path(filename).suffix.lower() or ".bin"
    key = f"uploads/{uuid.uuid4().hex}{ext}"

    client = _s3_client(settings)
    url = client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=PRESIGN_EXPIRES_IN,
    )
    logger.info("Generated presigned PUT URL for key=%s", key)
    return url, key


def download_from_s3(settings: Settings, s3_key: str, local_path: str) -> None:
    """Download object from S3 to a local file."""
    bucket = settings.s3_upload_bucket
    if not bucket:
        raise ValueError("S3 upload bucket not configured (S3_UPLOAD_BUCKET)")

    client = _s3_client(settings)
    client.download_file(bucket, s3_key, local_path)
    logger.info("Downloaded s3://%s/%s to %s", bucket, s3_key, local_path)
