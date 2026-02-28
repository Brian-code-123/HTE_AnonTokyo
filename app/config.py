import tempfile
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── ElevenLabs Speech-to-Text (Scribe API) ───────────────────────────
    elevenlabs_api_key: str = ""
    elevenlabs_stt_model: str = "scribe_v2"

    # ── Google Gemini (body language analysis) ──────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-pro-preview"

    # ── Minimax LLM (teacher feedback via Anthropic SDK) ─────────────
    minimax_api_key: str = ""
    minimax_model: str = "MiniMax-M2.5"
    minimax_base_url: str = "https://api.minimax.io/anthropic"

    # ── AWS (S3 presigned uploads for large files; Lambda has 6 MB limit) ─
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_upload_bucket: str = ""

    # ── Misc ────────────────────────────────────────────────────────────
    fluctuation_window_seconds: int = 180
    temp_dir: str = tempfile.gettempdir()
    # Max video file size accepted (bytes).  Default = 500 MB.
    max_upload_bytes: int = 500 * 1024 * 1024
    database_path: str = "/tmp/hte_anontokyo.db"

    # ── Direct upload via S3 (for large files) ───────────────────────────
    s3_upload_bucket: str = ""
    s3_upload_region: str = "us-east-1"
    s3_upload_prefix: str = "uploads"
    s3_presign_expires_seconds: int = 3600

    # ── Persistence backend (use DynamoDB in Lambda for cross-instance history) ──
    dynamodb_table_name: str = ""
    dynamodb_region: str = "us-east-1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
