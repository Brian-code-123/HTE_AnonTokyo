"""
Unified analysis endpoints — combines transcription, body language analysis,
and rubric evaluation into a single pipeline.

  POST /api/full-analysis          — file upload
  POST /api/full-analysis/youtube  — YouTube URL

Both endpoints accept a `use_placeholder` flag (default True).  When True,
the pre-analyzed "Mark John" data is returned immediately.  When False, the
full Gemini pipeline runs: transcription → body language → rubric evaluation.
"""
import asyncio
import logging
import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import get_settings
from app.services.s3_upload import download_from_s3
from app.schemas.response import (
    BodyLanguageSegmentReport,
    BodyLanguageSummary,
    FluctuationWindow,
    FullAnalysisRequest,
    FullAnalysisResponse,
    KnowledgePointReport,
    FullAnalysisS3Request,
    SegmentResult,
    TranscriptResult,
    TranscriptSegment,
)
from app.services.audio_utils import extract_audio
from app.services.gemini_body_language import (
    analyze_body_language,
    download_youtube_video,
    get_video_duration,
    upload_video_to_gemini,
)
from app.services.gemini_evaluation import evaluate_with_gemini
from app.services.knowledge_point_analysis import analyze_knowledge_points
from app.services.placeholder_data import (
    PLACEHOLDER_RUBRIC_EVALUATION,
    PLACEHOLDER_VIDEO_SOURCE,
    load_placeholder_body_language,
)
from app.services.session_stats import stats as session_stats
from app.services.elevenlabs_transcribe import ElevenLabsTranscribeService
from app.services.voice_analysis import calculate_fluctuation_timeline
from app.services.persistence import save_event
from app.services.s3_uploads import download_s3_file
from app.services.youtube_service import YouTubeDownloader, is_valid_youtube_url

logger = logging.getLogger(__name__)

router = APIRouter(tags=["full-analysis"])

ALLOWED_EXTENSIONS = {
    ".mp4", ".mov", ".mkv", ".avi",
    ".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac",
}

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi", ".webm"}


def _build_transcript_result(ws_result, job_id: str) -> TranscriptResult:
    segments = [
        TranscriptSegment(start=s.start, end=s.end, text=s.text)
        for s in ws_result.segments
    ]
    return TranscriptResult(
        job_id=job_id,
        language=ws_result.language,
        duration=round(ws_result.duration, 2),
        full_text=ws_result.full_text,
        segments=segments,
        srt_content=ws_result.srt_content,
    )


def _build_body_language_summary(
    results: list[dict], model: str, output_dir: str,
) -> BodyLanguageSummary:
    combined_path = Path(output_dir) / "00_full_body_language_report.md"
    combined_report = (
        combined_path.read_text(encoding="utf-8")
        if combined_path.exists()
        else ""
    )
    segments = []
    for r in results:
        seg_path = Path(output_dir) / r["file"]
        markdown = seg_path.read_text(encoding="utf-8") if seg_path.exists() else ""
        segments.append(BodyLanguageSegmentReport(
            segment=r["segment"],
            start=r["start"],
            end=r["end"],
            markdown=markdown,
        ))
    return BodyLanguageSummary(
        model=model,
        total_segments=len(segments),
        segments=segments,
        combined_report=combined_report,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/full-analysis  — file upload or S3 key (for large files)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/full-analysis", response_model=FullAnalysisResponse)
async def full_analysis_file(
    use_placeholder: bool = Form(True),
    language: str = Form("auto"),
    model: str = Form("gemini-3.1-pro-preview"),
    segment_duration: int = Form(180),
    file: UploadFile | None = File(None),
    s3_key: str | None = Form(None),
    filename: str | None = Form(None),
) -> FullAnalysisResponse:
    """Full analysis pipeline. Send either a multipart file or s3_key (after uploading via /api/upload-url).

    When use_placeholder=True (default), returns pre-analyzed Mark John data.
    When use_placeholder=False, runs the live pipeline.
    """
    settings = get_settings()
    job_id = uuid.uuid4().hex

    if (file is None) == (s3_key is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either a file upload or s3_key (from /api/upload-url), not both and not neither.",
        )

    if use_placeholder:
        body_language = load_placeholder_body_language()
        session_stats.full_analyses += 1
        display_name = (file.filename if file else filename) or (s3_key or "upload")
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=display_name,
            is_placeholder=True,
            transcript=None,
            body_language=body_language,
            rubric_evaluation=PLACEHOLDER_RUBRIC_EVALUATION,
        )
        save_event(
            "full_analysis",
            {
                "is_placeholder": True,
                "source_type": "s3" if s3_key else "upload",
                "file_name": display_name,
                "s3_key": s3_key,
            },
            job_id=job_id,
            source="full_analysis_file",
        )
        return response

    # ── Resolve input path: from file or from S3 ─────────────────────────────
    if s3_key:
        ext = Path(s3_key).suffix.lower() or ".bin"
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}' from S3 key. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        display_name = filename or s3_key.split("/")[-1] or "upload"
    else:
        display_name = file.filename or "upload"
        ext = Path(display_name).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

    api_key = settings.gemini_api_key
    use_gemini = bool(api_key)

    tmp_dir = Path(settings.temp_dir) / f"fa_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = str(tmp_dir / "results")

    raw_path = str(tmp_dir / f"input{ext}")
    wav_path = str(tmp_dir / "audio.wav")

    try:
        if s3_key:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, download_from_s3, settings, s3_key, raw_path)
            size_mb = Path(raw_path).stat().st_size / 1e6
            logger.info("[%s] Downloaded from S3: %s (%.1f MB)", job_id, s3_key, size_mb)
        else:
            contents = await file.read()
            if len(contents) > settings.max_upload_bytes:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds the {settings.max_upload_bytes // (1024 * 1024)} MB limit.",
                )
            Path(raw_path).write_bytes(contents)
            logger.info("[%s] Saved upload: %s (%.1f MB)", job_id, display_name, len(contents) / 1e6)

        loop = asyncio.get_running_loop()

        # Step 1: Extract audio, then transcribe + voice fluctuation in parallel
        await loop.run_in_executor(None, extract_audio, raw_path, wav_path)
        logger.info("[%s] Audio extracted", job_id)

        if not settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")
        svc = ElevenLabsTranscribeService(settings.elevenlabs_api_key, settings.elevenlabs_stt_model)

        transcript_future = loop.run_in_executor(None, svc.transcribe, wav_path, language)
        fluctuation_future = loop.run_in_executor(
            None, calculate_fluctuation_timeline, wav_path, settings.fluctuation_window_seconds,
        )
        ws_result, fluctuation_raw = await asyncio.gather(transcript_future, fluctuation_future)

        transcript_result = _build_transcript_result(ws_result, job_id)
        fluctuation_timeline = [FluctuationWindow(**w) for w in fluctuation_raw]
        logger.info("[%s] Transcription done: %d segments", job_id, len(ws_result.segments))
        logger.info("[%s] Voice fluctuation done: %d windows", job_id, len(fluctuation_timeline))

        # Step 2: Body language analysis (only for video files)
        body_language: BodyLanguageSummary | None = None
        if ext in VIDEO_EXTENSIONS:
            if use_gemini:
                file_uri = await loop.run_in_executor(
                    None, upload_video_to_gemini, api_key, raw_path,
                )
                duration = await loop.run_in_executor(None, get_video_duration, raw_path)
                bl_results = await loop.run_in_executor(
                    None,
                    analyze_body_language,
                    api_key, model, file_uri, duration, output_dir, segment_duration,
                )
                body_language = _build_body_language_summary(bl_results, model, output_dir)
                logger.info("[%s] Body language analysis done: %d segments", job_id, len(bl_results))
            else:
                body_language = load_placeholder_body_language()
                logger.info("[%s] Body language: using fallback from body_language_analysis/", job_id)

        # Step 3: Rubric evaluation (Gemini or fallback)
        bl_report = body_language.combined_report if body_language else None
        if use_gemini:
            rubric_evaluation = await loop.run_in_executor(
                None,
                evaluate_with_gemini,
                api_key, model, ws_result.full_text, bl_report,
            )
            logger.info("[%s] Rubric evaluation done", job_id)
        else:
            rubric_evaluation = PLACEHOLDER_RUBRIC_EVALUATION
            logger.info("[%s] Rubric: using fallback from body_language_analysis/", job_id)

        # Step 4: Knowledge point analysis (Gemini or skip)
        knowledge_points: KnowledgePointReport | None = None
        if use_gemini:
            try:
                kp_raw = await loop.run_in_executor(
                    None,
                    analyze_knowledge_points,
                    api_key, model, ws_result.full_text,
                    bl_report, fluctuation_raw,
                )
                knowledge_points = KnowledgePointReport(**kp_raw)
                logger.info("[%s] Knowledge point analysis done: %d points", job_id, len(knowledge_points.points))
            except Exception as exc:
                logger.warning("[%s] Knowledge point analysis failed (non-fatal): %s", job_id, exc)

        session_stats.full_analyses += 1
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=display_name,
            is_placeholder=False,
            transcript=transcript_result,
            body_language=body_language,
            rubric_evaluation=rubric_evaluation,
            fluctuation_timeline=fluctuation_timeline,
            knowledge_points=knowledge_points,
        )
        save_event(
            "full_analysis",
            {
                "is_placeholder": False,
                "source_type": "upload",
                "file_name": filename,
                "has_body_language": body_language is not None,
                "segment_count": body_language.total_segments if body_language else 0,
                "transcript_duration": transcript_result.duration,
            },
            job_id=job_id,
            source="full_analysis_file",
        )
        return response

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("[%s] Runtime error: %s", job_id, exc)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass


@router.post("/api/full-analysis/s3", response_model=FullAnalysisResponse)
async def full_analysis_s3(body: FullAnalysisS3Request) -> FullAnalysisResponse:
    settings = get_settings()
    job_id = uuid.uuid4().hex
    model = body.model or settings.gemini_model

    if body.use_placeholder:
        body_language = load_placeholder_body_language()
        session_stats.full_analyses += 1
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=body.file_name or body.s3_key,
            is_placeholder=True,
            transcript=None,
            body_language=body_language,
            rubric_evaluation=PLACEHOLDER_RUBRIC_EVALUATION,
        )
        save_event(
            "full_analysis",
            {"is_placeholder": True, "source_type": "s3", "s3_key": body.s3_key},
            job_id=job_id,
            source="full_analysis_s3",
        )
        return response

    api_key = settings.gemini_api_key
    use_gemini = bool(api_key)

    ext = Path(body.file_name or body.s3_key).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    tmp_dir = Path(settings.temp_dir) / f"fas3_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = str(tmp_dir / "results")
    raw_path = str(tmp_dir / f"input{ext}")
    wav_path = str(tmp_dir / "audio.wav")

    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, download_s3_file, settings, body.s3_key, raw_path)
        await loop.run_in_executor(None, extract_audio, raw_path, wav_path)

        if not settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")
        svc = ElevenLabsTranscribeService(settings.elevenlabs_api_key, settings.elevenlabs_stt_model)
        ws_result = await loop.run_in_executor(None, svc.transcribe, wav_path, body.language)
        transcript_result = _build_transcript_result(ws_result, job_id)

        body_language: BodyLanguageSummary | None = None
        if ext in VIDEO_EXTENSIONS:
            if use_gemini:
                file_uri = await loop.run_in_executor(None, upload_video_to_gemini, api_key, raw_path)
                duration = await loop.run_in_executor(None, get_video_duration, raw_path)
                bl_results = await loop.run_in_executor(
                    None,
                    analyze_body_language,
                    api_key, model, file_uri, duration, output_dir, body.segment_duration,
                )
                body_language = _build_body_language_summary(bl_results, model, output_dir)
            else:
                body_language = load_placeholder_body_language()

        bl_report = body_language.combined_report if body_language else None
        if use_gemini:
            rubric_evaluation = await loop.run_in_executor(
                None, evaluate_with_gemini, api_key, model, ws_result.full_text, bl_report,
            )
        else:
            rubric_evaluation = PLACEHOLDER_RUBRIC_EVALUATION

        session_stats.full_analyses += 1
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=body.file_name or body.s3_key,
            is_placeholder=False,
            transcript=transcript_result,
            body_language=body_language,
            rubric_evaluation=rubric_evaluation,
        )
        save_event(
            "full_analysis",
            {
                "is_placeholder": False,
                "source_type": "s3",
                "s3_key": body.s3_key,
                "has_body_language": body_language is not None,
                "segment_count": body_language.total_segments if body_language else 0,
                "transcript_duration": transcript_result.duration,
            },
            job_id=job_id,
            source="full_analysis_s3",
        )
        return response
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ─────────────────────────────────────────────────────────────────────────────
#  POST /api/full-analysis/youtube  — YouTube URL
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/api/full-analysis/youtube", response_model=FullAnalysisResponse)
async def full_analysis_youtube(body: FullAnalysisRequest) -> FullAnalysisResponse:
    """Analyze a YouTube video through the full pipeline.

    When use_placeholder=True (default), returns pre-analyzed Mark John data.
    When use_placeholder=False, runs the live pipeline.
    """
    settings = get_settings()
    job_id = uuid.uuid4().hex

    if body.use_placeholder:
        body_language = load_placeholder_body_language()
        session_stats.full_analyses += 1
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=body.url,
            is_placeholder=True,
            transcript=None,
            body_language=body_language,
            rubric_evaluation=PLACEHOLDER_RUBRIC_EVALUATION,
        )
        save_event(
            "full_analysis",
            {"is_placeholder": True, "source_type": "youtube", "youtube_url": body.url},
            job_id=job_id,
            source="full_analysis_youtube",
        )
        return response

    # ── Live analysis pipeline ────────────────────────────────────────────
    api_key = body.gemini_api_key or settings.gemini_api_key
    use_gemini = bool(api_key)

    if not is_valid_youtube_url(body.url):
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    model = body.model or settings.gemini_model
    tmp_dir = Path(settings.temp_dir) / f"fayt_{job_id}"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    output_dir = str(tmp_dir / "results")

    try:
        loop = asyncio.get_running_loop()

        # Download video for body language analysis
        video_path = await loop.run_in_executor(
            None, download_youtube_video, body.url, str(tmp_dir),
        )
        logger.info("[%s] YouTube video downloaded: %s", job_id, video_path)

        # Download audio for transcription
        downloader = YouTubeDownloader(settings)
        wav_path = await loop.run_in_executor(
            None, downloader.download_audio, body.url, job_id,
        )
        logger.info("[%s] YouTube audio ready: %s", job_id, wav_path)

        # Step 1: Transcribe + voice fluctuation in parallel
        if not settings.elevenlabs_api_key:
            raise HTTPException(status_code=500, detail="ELEVENLABS_API_KEY not configured.")
        svc = ElevenLabsTranscribeService(settings.elevenlabs_api_key, settings.elevenlabs_stt_model)

        transcript_future = loop.run_in_executor(
            None, svc.transcribe, wav_path, body.language,
        )
        fluctuation_future = loop.run_in_executor(
            None, calculate_fluctuation_timeline, wav_path, settings.fluctuation_window_seconds,
        )
        ws_result, fluctuation_raw = await asyncio.gather(transcript_future, fluctuation_future)

        transcript_result = _build_transcript_result(ws_result, job_id)
        fluctuation_timeline = [FluctuationWindow(**w) for w in fluctuation_raw]
        logger.info("[%s] Transcription done: %d segments", job_id, len(ws_result.segments))
        logger.info("[%s] Voice fluctuation done: %d windows", job_id, len(fluctuation_timeline))

        # Step 2: Body language analysis
        if use_gemini:
            file_uri = await loop.run_in_executor(
                None, upload_video_to_gemini, api_key, video_path,
            )
            duration = await loop.run_in_executor(None, get_video_duration, video_path)
            bl_results = await loop.run_in_executor(
                None,
                analyze_body_language,
                api_key, model, file_uri, duration, output_dir, body.segment_duration,
            )
            body_language = _build_body_language_summary(bl_results, model, output_dir)
            logger.info("[%s] Body language analysis done: %d segments", job_id, len(bl_results))
        else:
            body_language = load_placeholder_body_language()
            logger.info("[%s] Body language: using fallback from body_language_analysis/", job_id)

        # Step 3: Rubric evaluation (Gemini or fallback)
        bl_report = body_language.combined_report if body_language else None
        if use_gemini:
            rubric_evaluation = await loop.run_in_executor(
                None,
                evaluate_with_gemini,
                api_key, model, ws_result.full_text, bl_report,
            )
            logger.info("[%s] Rubric evaluation done", job_id)
        else:
            rubric_evaluation = PLACEHOLDER_RUBRIC_EVALUATION
            logger.info("[%s] Rubric: using fallback from body_language_analysis/", job_id)

        # Step 4: Knowledge point analysis (Gemini or skip)
        knowledge_points: KnowledgePointReport | None = None
        if use_gemini:
            try:
                kp_raw = await loop.run_in_executor(
                    None,
                    analyze_knowledge_points,
                    api_key, model, ws_result.full_text,
                    bl_report, fluctuation_raw,
                )
                knowledge_points = KnowledgePointReport(**kp_raw)
                logger.info("[%s] Knowledge point analysis done: %d points", job_id, len(knowledge_points.points))
            except Exception as exc:
                logger.warning("[%s] Knowledge point analysis failed (non-fatal): %s", job_id, exc)

        session_stats.full_analyses += 1
        response = FullAnalysisResponse(
            job_id=job_id,
            video_source=body.url,
            is_placeholder=False,
            transcript=transcript_result,
            body_language=body_language,
            rubric_evaluation=rubric_evaluation,
            fluctuation_timeline=fluctuation_timeline,
            knowledge_points=knowledge_points,
        )
        save_event(
            "full_analysis",
            {
                "is_placeholder": False,
                "source_type": "youtube",
                "youtube_url": body.url,
                "has_body_language": body_language is not None,
                "segment_count": body_language.total_segments if body_language else 0,
                "transcript_duration": transcript_result.duration,
            },
            job_id=job_id,
            source="full_analysis_youtube",
        )
        return response

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        logger.error("[%s] Runtime error: %s", job_id, exc)
        raise HTTPException(status_code=502, detail=str(exc))
    finally:
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass
        audio_dir = Path(settings.temp_dir) / f"yt_{job_id}"
        if audio_dir.exists():
            try:
                shutil.rmtree(audio_dir, ignore_errors=True)
            except Exception:
                pass
