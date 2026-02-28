/**
 * Application Type Definitions
 * 
 * Core types used throughout the VoiceTrace application for type safety
 */

/** UI theme setting */
export type Theme = 'light' | 'dark'

/** User input method selection */
export type InputMode = 'upload' | 'youtube'

/** Analysis mode: transcription only vs full AI analysis */
export type AnalysisMode = 'transcribe' | 'full-analysis'

/** Top-level navigation tabs (3 tabs only) */
export type AppTab = 'dashboard' | 'for-you' | 'feedback'

/** Sub-tool identifiers available under the "For You" page */
export type ForYouTool =
  | 'transcribe'
  | 'voice-report'
  | 'video-gen'
  | 'rubrics'
  | 'timeline'
  | 'compare'
  | 'coaching'

/** Coaching suggestion from AI based on trend data */
export interface CoachingSuggestion {
  area: string
  current_score: number
  trend: number
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  action_items: string[]
}

/** Coaching plan response from backend */
export interface CoachingPlan {
  teacher_name: string
  generated_at: string
  overall_summary: string
  suggestions: CoachingSuggestion[]
}

/** Transcription job lifecycle states */
export type JobStatus =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'transcribing'
  | 'analyzing'
  | 'evaluating'
  | 'done'
  | 'error'

/** Individual transcript segment with timing information */
export interface TranscriptSegment {
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Transcribed text for this segment */
  text: string
}

/** Complete transcription result from API */
export interface TranscriptResult {
  job_id: string
  language: string
  duration: number
  full_text: string
  segments: TranscriptSegment[]
  srt_content: string
}

/** Current progress state for active transcription job */
export interface ProgressState {
  status: JobStatus
  percent: number
  message: string
}

// ── MiniMax TTS Types ────────────────────────────────────────────────────

/** Available TTS voice option */
export interface TTSVoice {
  id: string
  name: string
  lang: string
}

/** TTS generation request parameters */
export interface TTSRequest {
  text: string
  voice_id: string
  speed?: number
  emotion?: string
  language_boost?: string
}

/** TTS generation response */
export interface TTSResult {
  audio_url: string
  duration_ms: number
  sample_rate: number
  word_count: number
  format: string
}

/** Emotion options for TTS */
export type TTSEmotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised'

// ── MiniMax Video Generation Types ───────────────────────────────────────

/** Video generation task status */
export type VideoStatus = 'Preparing' | 'Queueing' | 'Processing' | 'Success' | 'Fail'

/** Video generation request */
export interface VideoGenRequest {
  prompt: string
  duration?: 6 | 10
  resolution?: '720P' | '768P' | '1080P'
  model?: string
}

/** Video generation task result */
export interface VideoGenResult {
  task_id: string
  status: VideoStatus
  file_id?: string | null
  video_width?: number | null
  video_height?: number | null
  download_url?: string | null
}

// ── Full Analysis Types ───────────────────────────────────────────────────

/** Individual body-language segment */
export interface BodyLanguageSegment {
  segment: number
  start: string
  end: string
  markdown: string
}

/** Body language analysis report */
export interface BodyLanguageReport {
  segments: BodyLanguageSegment[]
  combined_report: string
  model: string
}

/** Voice fluctuation measurement for a time window */
export interface FluctuationWindow {
  timestamp_start: number
  timestamp_end: number
  fluctuation_score: number
}

/** Per-knowledge-point analysis from LLM */
export interface KnowledgePointAnalysis {
  topic: string
  timestamp_start: number
  timestamp_end: number
  transcript_excerpt: string
  content_analysis: string
  content_score: number
  presentation_analysis: string
  presentation_score: number
  suggestions: string[]
}

/** Knowledge point report with averages */
export interface KnowledgePointReport {
  points: KnowledgePointAnalysis[]
  avg_content_score: number
  avg_presentation_score: number
}

/** Combined full analysis result (body language + rubric + transcript + fluctuation + knowledge points) */
export interface FullAnalysisResult {
  is_placeholder: boolean
  transcript?: TranscriptResult
  body_language?: BodyLanguageReport
  rubric_evaluation?: string
  fluctuation_timeline?: FluctuationWindow[]
  knowledge_points?: KnowledgePointReport
}

/** Options for file-based full analysis */
export interface FullAnalysisFileOptions {
  file: File
  language: string
  usePlaceholder: boolean
  onProgress?: (pct: number) => void
}

/** Options for YouTube-based full analysis */
export interface FullAnalysisYoutubeOptions {
  url: string
  language: string
  usePlaceholder: boolean
}

// ── Dashboard Types ──────────────────────────────────────────────────────

export interface ServiceStatus {
  name: string
  configured: boolean
  label: string
}

export interface DashboardStats {
  transcriptions: number
  full_analyses: number
  feedback_generated: number
  uptime_seconds: number
}

export interface DashboardData {
  status: string
  version: string
  services: ServiceStatus[]
  stats: DashboardStats
  capabilities: string[]
}

export interface HistoryEvent {
  id: number
  event_type: string
  status: string
  job_id?: string | null
  source?: string | null
  payload: Record<string, unknown>
  created_at: string
}

export interface HistoryData {
  status: string
  total: number
  events: HistoryEvent[]
}

// ── LLM Feedback Types ──────────────────────────────────────────────────

/** Feedback generation request */
export interface FeedbackRequest {
  transcript?: string
  body_language_report?: string
  rubric_evaluation?: string
  additional_context?: string
}

/** Feedback generation response from Minimax LLM */
export interface FeedbackResult {
  status: string
  feedback: string
  model: string
}

// ── Teacher Types ────────────────────────────────────────────────────────

export interface Teacher {
  id: string
  name: string
  subject: string
  created_at: string
}

// ── Analysis Storage Types ───────────────────────────────────────────────

export interface AnalysisSummary {
  id: string
  teacher_id: string
  teacher_name: string
  lesson_title: string
  lesson_date: string
  overall_score: number
  pace_score: number
  body_score: number
  clarity_score: number
  engagement_score: number
  created_at: string
}

export interface AnalysisDetail extends AnalysisSummary {
  payload: Record<string, unknown>
}

// ── Rubric Types ─────────────────────────────────────────────────────────

export interface RubricDimension {
  name: string
  weight: number
  description: string
  max_score: number
}

export interface Rubric {
  id: string
  teacher_id: string | null
  name: string
  dimensions: RubricDimension[]
  created_at: string
  updated_at: string
}

// ── Share Types ──────────────────────────────────────────────────────────

export interface ShareLink {
  share_token: string
  expires_at: string
  share_url: string
}

// ── Timeline / Metrics Types ─────────────────────────────────────────────

export interface AggregatedMetrics {
  avg_overall: number
  avg_pace: number
  avg_body: number
  avg_clarity: number
  avg_engagement: number
  trend_overall: number
  trend_pace: number
  trend_body: number
  trend_clarity: number
  trend_engagement: number
  best_lesson_id?: string
  worst_lesson_id?: string
  date_range: string[]
}

export interface TeacherTimeline {
  teacher_name: string
  total_lessons: number
  analyses: AnalysisSummary[]
  aggregated_metrics: AggregatedMetrics | null
}

// ── Comparison Types ─────────────────────────────────────────────────────

export interface ComparisonItem {
  id: string
  teacher_name: string
  lesson_title: string
  lesson_date: string
  overall_score: number
  pace_score: number
  body_score: number
  clarity_score: number
  engagement_score: number
}

export interface ComparisonResult {
  items: ComparisonItem[]
  score_differences: Record<string, number>
}
