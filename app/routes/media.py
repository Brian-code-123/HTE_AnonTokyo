"""MiniMax media endpoints (TTS + video generation).

  POST /api/tts
  GET  /api/tts/voices
  POST /api/video/generate
  GET  /api/video/status/{task_id}
"""
from __future__ import annotations

import logging

import requests
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.config import get_settings
from app.schemas.response import (
    TTSGenerateRequest,
    TTSGenerateResponse,
    TTSVoicesResponse,
    VideoGenerateRequest,
    VideoGenerateResponse,
    VideoStatusResponse,
)
from app.services.persistence import save_event

logger = logging.getLogger(__name__)

router = APIRouter(tags=["media"])

MINIMAX_V1_BASE = "https://api.minimax.io/v1"
MINIMAX_TIMEOUT = 60

ELEVENLABS_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
ELEVENLABS_TIMEOUT = 60


class ElevenLabsTTSRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"   # Rachel
    model_id: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity_boost: float = 0.75
    style: float = 0.0
    speed: float = 1.0

DEFAULT_VOICES = [
    {"id": "male-qn-qingse", "name": "Qingse (Male)", "lang": "zh"},
    {"id": "male-qn-jingying", "name": "Jingying (Male)", "lang": "zh"},
    {"id": "male-qn-badao", "name": "Badao (Male)", "lang": "zh"},
    {"id": "male-qn-daxuesheng", "name": "Student (Male)", "lang": "zh"},
    {"id": "female-shaonv", "name": "Shaonv (Female)", "lang": "zh"},
    {"id": "female-yujie", "name": "Yujie (Female)", "lang": "zh"},
    {"id": "female-chengshu", "name": "Chengshu (Female)", "lang": "zh"},
    {"id": "female-tianmei", "name": "Tianmei (Female)", "lang": "zh"},
    {"id": "presenter_male", "name": "Presenter (Male)", "lang": "en"},
    {"id": "presenter_female", "name": "Presenter (Female)", "lang": "en"},
    {"id": "audiobook_male_1", "name": "Audiobook (Male)", "lang": "en"},
    {"id": "audiobook_female_1", "name": "Audiobook (Female)", "lang": "en"},
]

DEFAULT_EMOTIONS = ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]


def _minimax_headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _parse_minimax_error(data: dict) -> str:
    base_resp = data.get("base_resp") or {}
    return base_resp.get("status_msg") or "MiniMax API error"


@router.post("/api/tts", response_model=TTSGenerateResponse)
def generate_tts(body: TTSGenerateRequest) -> TTSGenerateResponse:
    settings = get_settings()
    if not settings.minimax_api_key:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY not configured.")

    if len(body.text) > 10000:
        raise HTTPException(status_code=400, detail="Text exceeds 10000 character limit")

    payload = {
        "model": "speech-02-hd",
        "text": body.text,
        "stream": False,
        "voice_setting": {
            "voice_id": body.voice_id,
            "speed": body.speed,
            "vol": 1,
            "pitch": 0,
            "emotion": body.emotion,
        },
        "audio_setting": {
            "sample_rate": 32000,
            "bitrate": 128000,
            "format": "mp3",
            "channel": 1,
        },
        "language_boost": body.language_boost,
        "output_format": "url",
    }

    try:
        resp = requests.post(
            f"{MINIMAX_V1_BASE}/t2a_v2",
            headers=_minimax_headers(settings.minimax_api_key),
            json=payload,
            timeout=MINIMAX_TIMEOUT,
        )
        data = resp.json()
    except requests.RequestException as exc:
        logger.error("TTS request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"TTS request failed: {exc}")
    except ValueError:
        raise HTTPException(status_code=502, detail="TTS response was not valid JSON")

    if (data.get("base_resp") or {}).get("status_code") != 0:
        raise HTTPException(status_code=502, detail=_parse_minimax_error(data))

    extra = data.get("extra_info") or {}
    media = data.get("data") or {}
    result = TTSGenerateResponse(
        audio_url=media.get("audio", ""),
        duration_ms=extra.get("audio_length", 0),
        sample_rate=extra.get("audio_sample_rate", 32000),
        word_count=extra.get("word_count", 0),
        format=extra.get("audio_format", "mp3"),
    )
    save_event(
        "tts_generation",
        {
            "voice_id": body.voice_id,
            "emotion": body.emotion,
            "word_count": result.word_count,
            "duration_ms": result.duration_ms,
            "format": result.format,
        },
        source="tts_generate",
    )
    return result


@router.get("/api/tts/voices", response_model=TTSVoicesResponse)
def get_tts_voices() -> TTSVoicesResponse:
    return TTSVoicesResponse(voices=DEFAULT_VOICES, emotions=DEFAULT_EMOTIONS)


# ── ElevenLabs TTS ─────────────────────────────────────────────────────────

@router.post("/api/elevenlabs/tts")
def generate_elevenlabs_tts(body: ElevenLabsTTSRequest) -> Response:
    """Proxy ElevenLabs TTS server-side — avoids CORS and keeps the API key
    out of the browser bundle.
    Returns raw MP3 audio bytes with Content-Type: audio/mpeg.
    """
    settings = get_settings()
    api_key = settings.elevenlabs_api_key
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ELEVENLABS_API_KEY not configured in backend .env",
        )

    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty")

    payload = {
        "text": body.text[:5_000],
        "model_id": body.model_id,
        "voice_settings": {
            "stability":        max(0.0, min(1.0, body.stability)),
            "similarity_boost": max(0.0, min(1.0, body.similarity_boost)),
            "style":            max(0.0, min(1.0, body.style)),
            "use_speaker_boost": True,
            "speed":            max(0.7, min(1.2, body.speed)),
        },
    }

    try:
        resp = requests.post(
            f"{ELEVENLABS_TTS_URL}/{body.voice_id}",
            headers={
                "xi-api-key":   api_key,
                "Content-Type": "application/json",
                "Accept":       "audio/mpeg",
            },
            json=payload,
            timeout=ELEVENLABS_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("ElevenLabs TTS request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"ElevenLabs TTS request failed: {exc}")

    if not resp.ok:
        # Try to extract a helpful error message
        try:
            err = resp.json()
            detail = err.get("detail", {})
            if isinstance(detail, dict):
                status_code = detail.get("status", "")
                msg = detail.get("message", str(detail))
                if status_code == "missing_permissions":
                    msg = (
                        "ElevenLabs API key is missing the 'text_to_speech' permission. "
                        "Fix it at: elevenlabs.io \u2192 Profile \u2192 API Keys \u2192 Edit key \u2192 enable Text to Speech."
                    )
            else:
                msg = str(detail) or resp.text[:300]
        except Exception:
            msg = resp.text[:300] or f"HTTP {resp.status_code}"

        logger.error("ElevenLabs TTS error %s: %s", resp.status_code, msg)
        raise HTTPException(status_code=resp.status_code, detail=msg)

    # Success — stream raw MP3 bytes back to the browser
    return Response(
        content=resp.content,
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'inline; filename="voice_report.mp3"'},
    )


@router.post("/api/video/generate", response_model=VideoGenerateResponse)
def generate_video(body: VideoGenerateRequest) -> VideoGenerateResponse:
    settings = get_settings()
    if not settings.minimax_api_key:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY not configured.")

    try:
        resp = requests.post(
            f"{MINIMAX_V1_BASE}/video_generation",
            headers=_minimax_headers(settings.minimax_api_key),
            json={
                "model": body.model,
                "prompt": body.prompt,
                "duration": body.duration,
                "resolution": body.resolution,
            },
            timeout=MINIMAX_TIMEOUT,
        )
        data = resp.json()
    except requests.RequestException as exc:
        logger.error("Video generate request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Video generation request failed: {exc}")
    except ValueError:
        raise HTTPException(status_code=502, detail="Video generation response was not valid JSON")

    if (data.get("base_resp") or {}).get("status_code") != 0:
        raise HTTPException(status_code=502, detail=_parse_minimax_error(data))

    task_id = data.get("task_id")
    if not task_id:
        raise HTTPException(status_code=502, detail="Video generation response missing task_id")
    save_event(
        "video_generation",
        {
            "task_id": task_id,
            "model": body.model,
            "duration": body.duration,
            "resolution": body.resolution,
        },
        source="video_generate",
    )
    return VideoGenerateResponse(task_id=task_id)


@router.get("/api/video/status/{task_id}", response_model=VideoStatusResponse)
def get_video_status(task_id: str) -> VideoStatusResponse:
    settings = get_settings()
    if not settings.minimax_api_key:
        raise HTTPException(status_code=500, detail="MINIMAX_API_KEY not configured.")

    try:
        resp = requests.get(
            f"{MINIMAX_V1_BASE}/query/video_generation",
            headers={"Authorization": f"Bearer {settings.minimax_api_key}"},
            params={"task_id": task_id},
            timeout=MINIMAX_TIMEOUT,
        )
        data = resp.json()
    except requests.RequestException as exc:
        logger.error("Video status request failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Video status request failed: {exc}")
    except ValueError:
        raise HTTPException(status_code=502, detail="Video status response was not valid JSON")

    if (data.get("base_resp") or {}).get("status_code") != 0:
        raise HTTPException(status_code=502, detail=_parse_minimax_error(data))

    result = VideoStatusResponse(
        task_id=data.get("task_id", task_id),
        status=data.get("status", "Fail"),
        file_id=data.get("file_id"),
        video_width=data.get("video_width"),
        video_height=data.get("video_height"),
        download_url=None,
    )

    if result.status == "Success" and result.file_id:
        try:
            dl_resp = requests.get(
                f"{MINIMAX_V1_BASE}/files/retrieve",
                headers={"Authorization": f"Bearer {settings.minimax_api_key}"},
                params={"file_id": result.file_id},
                timeout=MINIMAX_TIMEOUT,
            )
            dl_data = dl_resp.json()
            file_data = dl_data.get("file") or {}
            result.download_url = file_data.get("download_url")
        except (requests.RequestException, ValueError):
            logger.warning("Video download URL fetch failed for file_id=%s", result.file_id)

    save_event(
        "video_status",
        {
            "task_id": result.task_id,
            "status": result.status,
            "file_id": result.file_id,
            "has_download_url": bool(result.download_url),
        },
        source="video_status",
    )
    return result
