from typing import Any

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


class KnowledgePointAnalysis(BaseModel):
    topic: str
    timestamp_start: float
    timestamp_end: float
    transcript_excerpt: str
    content_analysis: str
    content_score: int
    presentation_analysis: str
    presentation_score: int
    suggestions: list[str]


class KnowledgePointReport(BaseModel):
    points: list[KnowledgePointAnalysis]
    avg_content_score: float
    avg_presentation_score: float


class FullAnalysisResponse(BaseModel):
    status: str = "success"
    job_id: str
    video_source: str
    is_placeholder: bool
    transcript: TranscriptResult | None = None
    body_language: BodyLanguageSummary | None = None
    rubric_evaluation: str | None = None
    fluctuation_timeline: list[FluctuationWindow] | None = None
    knowledge_points: KnowledgePointReport | None = None


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


class HistoryEvent(BaseModel):
    id: int
    event_type: str
    status: str
    job_id: str | None = None
    source: str | None = None
    payload: dict[str, Any]
    created_at: str


class HistoryResponse(BaseModel):
    status: str = "ok"
    total: int
    events: list[HistoryEvent]


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


# ── Direct upload via S3 ──────────────────────────────────────────────────────
class PresignUploadRequest(BaseModel):
    file_name: str
    content_type: str | None = None


class PresignUploadResponse(BaseModel):
    upload_id: str
    s3_key: str
    upload_url: str
    expires_in: int


class AnalyzeS3Request(BaseModel):
    s3_key: str
    language: str = "auto"
    file_name: str | None = None


class FullAnalysisS3Request(BaseModel):
    s3_key: str
    language: str = "auto"
    use_placeholder: bool = True
    model: str = "gemini-3.1-pro-preview"
    segment_duration: int = 180
    file_name: str | None = None


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


# ── Teacher CRUD ──────────────────────────────────────────────────────────────
class TeacherCreate(BaseModel):
    id: str
    name: str
    subject: str = ""

class TeacherResponse(BaseModel):
    id: str
    name: str
    subject: str
    created_at: str


# ── Analysis Storage ──────────────────────────────────────────────────────────
class AnalysisSaveRequest(BaseModel):
    analysis_id: str
    teacher_id: str
    teacher_name: str
    lesson_title: str
    lesson_date: str
    scores: dict[str, float]
    payload: dict[str, Any]

class AnalysisSummary(BaseModel):
    id: str
    teacher_id: str
    teacher_name: str
    lesson_title: str
    lesson_date: str
    overall_score: float
    pace_score: float
    body_score: float
    clarity_score: float
    engagement_score: float
    created_at: str

class AnalysisDetail(AnalysisSummary):
    payload: dict[str, Any]


# ── Rubric ────────────────────────────────────────────────────────────────────
class RubricDimension(BaseModel):
    name: str
    weight: float = 1.0
    description: str = ""
    max_score: int = 5

class RubricCreate(BaseModel):
    name: str
    dimensions: list[RubricDimension]
    teacher_id: str | None = None

class RubricResponse(BaseModel):
    id: str
    teacher_id: str | None
    name: str
    dimensions: list[dict[str, Any]]
    created_at: str
    updated_at: str


# ── Share Links ───────────────────────────────────────────────────────────────
class ShareCreateRequest(BaseModel):
    analysis_id: str
    days: int = 30

class ShareCreateResponse(BaseModel):
    share_token: str
    expires_at: str
    share_url: str

class SharedAnalysisResponse(BaseModel):
    analysis: AnalysisDetail
    share_info: dict[str, Any]


# ── Teacher Timeline / Metrics ────────────────────────────────────────────────
class AggregatedMetrics(BaseModel):
    avg_overall: float
    avg_pace: float
    avg_body: float
    avg_clarity: float
    avg_engagement: float
    trend_overall: float
    trend_pace: float
    trend_body: float
    trend_clarity: float
    trend_engagement: float
    best_lesson_id: str | None = None
    worst_lesson_id: str | None = None
    date_range: list[str] = []

class TeacherTimelineResponse(BaseModel):
    teacher_name: str
    total_lessons: int
    analyses: list[AnalysisSummary]
    aggregated_metrics: AggregatedMetrics | None = None


# ── Comparison ────────────────────────────────────────────────────────────────
class ComparisonRequest(BaseModel):
    analysis_ids: list[str]

class ComparisonItem(BaseModel):
    id: str
    teacher_name: str
    lesson_title: str
    lesson_date: str
    overall_score: float
    pace_score: float
    body_score: float
    clarity_score: float
    engagement_score: float

class ComparisonResponse(BaseModel):
    items: list[ComparisonItem]
    score_differences: dict[str, float]


# ── PDF Export ────────────────────────────────────────────────────────────────
class PDFExportRequest(BaseModel):
    analysis_id: str
    include_body_language: bool = True
    include_knowledge_points: bool = True
    include_transcript: bool = False

class PDFExportResponse(BaseModel):
    download_url: str
    filename: str
