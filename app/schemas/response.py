from pydantic import BaseModel


# ── kept for the original teaching-analysis endpoint ─────────────────────────
class FluctuationWindow(BaseModel):
    timestamp_start: float
    timestamp_end: float
    fluctuation_score: float


class AnalysisResponse(BaseModel):
    status: str = "success"
    transcript: str
    fluctuation_timeline: list[FluctuationWindow]


# ── new: matches the TranscriptResult type in the frontend ───────────────────
class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptResult(BaseModel):
    job_id: str
    language: str
    duration: float          # seconds
    full_text: str
    segments: list[TranscriptSegment]
    srt_content: str


# ── YouTube request body ──────────────────────────────────────────────────────
class YouTubeRequest(BaseModel):
    url: str
    language: str = "auto"


# ── Body language analysis ────────────────────────────────────────────────────
class BodyLanguageRequest(BaseModel):
    url: str
    gemini_api_key: str | None = None
    model: str = "gemini-3.1-pro-preview"
    segment_duration: int = 180


class SegmentResult(BaseModel):
    segment: int
    start: str
    end: str
    file: str
    chars: int
    error: str | None = None


class BodyLanguageResponse(BaseModel):
    status: str = "success"
    job_id: str
    video_source: str
    model: str
    total_segments: int
    segments: list[SegmentResult]
    combined_report_path: str


# ── Full analysis (unified pipeline) ─────────────────────────────────────────
class BodyLanguageSegmentReport(BaseModel):
    segment: int
    start: str
    end: str
    markdown: str


class FullAnalysisRequest(BaseModel):
    url: str
    language: str = "auto"
    use_placeholder: bool = True
    gemini_api_key: str | None = None
    model: str = "gemini-3.1-pro-preview"
    segment_duration: int = 180


class BodyLanguageSummary(BaseModel):
    model: str
    total_segments: int
    segments: list[BodyLanguageSegmentReport]
    combined_report: str


class FullAnalysisResponse(BaseModel):
    status: str = "success"
    job_id: str
    video_source: str
    is_placeholder: bool
    transcript: TranscriptResult | None = None
    body_language: BodyLanguageSummary | None = None
    rubric_evaluation: str | None = None


# ── Dashboard ────────────────────────────────────────────────────────────────
class ServiceStatus(BaseModel):
    name: str
    configured: bool
    label: str


class DashboardStats(BaseModel):
    transcriptions: int
    full_analyses: int
    feedback_generated: int
    uptime_seconds: int


class DashboardResponse(BaseModel):
    status: str = "ok"
    version: str
    services: list[ServiceStatus]
    stats: DashboardStats
    capabilities: list[str]


# ── LLM Feedback (Minimax) ───────────────────────────────────────────────────
class FeedbackRequest(BaseModel):
    transcript: str | None = None
    body_language_report: str | None = None
    rubric_evaluation: str | None = None
    additional_context: str | None = None


class FeedbackResponse(BaseModel):
    status: str = "success"
    feedback: str
    model: str


# ── MiniMax TTS + Video ─────────────────────────────────────────────────────
class TTSGenerateRequest(BaseModel):
    text: str
    voice_id: str = "male-qn-qingse"
    speed: float = 1.0
    emotion: str = "neutral"
    language_boost: str = "auto"


class TTSGenerateResponse(BaseModel):
    audio_url: str
    duration_ms: int
    sample_rate: int
    word_count: int
    format: str


class TTSVoice(BaseModel):
    id: str
    name: str
    lang: str


class TTSVoicesResponse(BaseModel):
    voices: list[TTSVoice]
    emotions: list[str]


class VideoGenerateRequest(BaseModel):
    prompt: str
    duration: int = 6
    resolution: str = "768P"
    model: str = "T2V-01"


class VideoGenerateResponse(BaseModel):
    task_id: str


class VideoStatusResponse(BaseModel):
    task_id: str
    status: str
    file_id: str | None = None
    video_width: int | None = None
    video_height: int | None = None
    download_url: str | None = None
