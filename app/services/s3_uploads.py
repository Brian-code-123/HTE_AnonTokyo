import uuid
from pathlib import Path

import boto3

from app.config import Settings


def _s3_client(region: str):
    return boto3.client("s3", region_name=region)


def create_presigned_upload(settings: Settings, file_name: str, content_type: str | None) -> tuple[str, str]:
    if not settings.s3_upload_bucket:
        raise ValueError("S3_UPLOAD_BUCKET not configured.")

    ext = Path(file_name).suffix.lower() or ".bin"
    upload_id = uuid.uuid4().hex
    prefix = settings.s3_upload_prefix.strip("/")
    s3_key = f"{prefix}/{upload_id}{ext}" if prefix else f"{upload_id}{ext}"

    params = {
        "Bucket": settings.s3_upload_bucket,
        "Key": s3_key,
        "ContentType": content_type or "application/octet-stream",
    }
    upload_url = _s3_client(settings.s3_upload_region).generate_presigned_url(
        "put_object",
        Params=params,
        ExpiresIn=settings.s3_presign_expires_seconds,
    )
    return s3_key, upload_url


def download_s3_file(settings: Settings, s3_key: str, output_path: str) -> None:
    if not settings.s3_upload_bucket:
        raise ValueError("S3_UPLOAD_BUCKET not configured.")

    _s3_client(settings.s3_upload_region).download_file(
        settings.s3_upload_bucket,
        s3_key,
        output_path,
    )
