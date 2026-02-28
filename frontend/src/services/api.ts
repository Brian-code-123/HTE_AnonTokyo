/**
 * API Service Module
 * 
 * Handles all HTTP communication with the backend:
 * - File transcription endpoint with progress tracking
 * - YouTube URL transcription endpoint
 * - Error handling and message extraction
 * 
 * API Endpoints:
 * - POST /api/analyze - File upload and transcription
 * - POST /api/analyze/youtube - YouTube URL transcription
 */
import axios, { AxiosError } from 'axios'
import type { TranscriptResult, TTSResult, TTSVoice, VideoGenResult, FullAnalysisResult, FullAnalysisFileOptions, FullAnalysisYoutubeOptions, FeedbackRequest, FeedbackResult, DashboardData, HistoryData, Teacher, AnalysisDetail, Rubric, RubricDimension, ShareLink, TeacherTimeline, ComparisonResult, CoachingPlan } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

/** Files larger than this use S3 presigned upload (Lambda has 6 MB request limit). */
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024

/**
 * Extract a readable error message from API response
 * Handles various error formats to provide consistent user feedback
 */
function extractError(err: unknown): string {
  if (err instanceof AxiosError && err.response?.data) {
    const d = err.response.data as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
  }
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

/** Get presigned PUT URL for direct S3 upload (for large files). */
export async function getUploadUrl(filename: string): Promise<{ upload_url: string; s3_key: string }> {
  const { data } = await api.get<{ upload_url: string; s3_key: string }>('/upload-url', {
    params: { filename },
  })
  return data
}

/** Upload file to S3 via presigned URL. */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    timeout: 60 * 60 * 1000,
    onUploadProgress: evt => {
      if (evt.total) onProgress?.(Math.round((evt.loaded / evt.total) * 100))
    },
  })
}

/** Options for file-based transcription */
export interface TranscribeFileOptions {
  /** Audio/video file to transcribe */
  file: File
  /** Language code (e.g. 'en', 'auto' for auto-detect) */
  language: string
  /** Optional callback for upload progress (0-100%) */
  onProgress?: (pct: number) => void
}

/** Options for YouTube URL transcription */
export interface TranscribeYoutubeOptions {
  /** YouTube video URL to transcribe */
  url: string
  /** Language code (e.g. 'en', 'auto' for auto-detect) */
  language: string
}

/**
 * Transcribe an uploaded audio/video file.
 * Files > 5 MB upload via S3 presigned URL to avoid Lambda 6 MB limit.
 */
export async function transcribeFile({
  file,
  language,
  onProgress,
}: TranscribeFileOptions): Promise<TranscriptResult> {
  try {
    if (file.size > LARGE_FILE_THRESHOLD) {
      const { upload_url, s3_key } = await getUploadUrl(file.name)
      onProgress?.(5)
      await uploadToS3(upload_url, file, pct => onProgress?.(5 + Math.round(pct * 0.35)))
      onProgress?.(45)
      const form = new FormData()
      form.append('s3_key', s3_key)
      form.append('filename', file.name)
      form.append('language', language)
      const { data } = await api.post<TranscriptResult>('/analyze', form, {
        timeout: 10 * 60 * 1000,
      })
      return data
    }
    const form = new FormData()
    form.append('file', file)
    form.append('language', language)
    const { data } = await api.post<TranscriptResult>('/analyze', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60 * 1000,
      onUploadProgress(evt) {
        if (evt.total) {
          onProgress?.(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/**
 * Transcribe audio from a YouTube URL
 * - Downloads audio from YouTube
 * - Transcribes with language detection
 * - Timeout: 10 minutes for download + transcription
 */
export async function transcribeYoutube({
  url,
  language,
}: TranscribeYoutubeOptions): Promise<TranscriptResult> {
  try {
    const { data } = await api.post<TranscriptResult>('/analyze/youtube', {
      url,
      language,
    }, {
      timeout: 10 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fullAnalysisFile({
  file,
  language,
  usePlaceholder,
  onProgress,
}: FullAnalysisFileOptions): Promise<FullAnalysisResult> {
  try {
    if (file.size > LARGE_FILE_THRESHOLD) {
      const { upload_url, s3_key } = await getUploadUrl(file.name)
      onProgress?.(5)
      await uploadToS3(upload_url, file, pct => onProgress?.(5 + Math.round(pct * 0.4)))
      onProgress?.(45)
      const form = new FormData()
      form.append('s3_key', s3_key)
      form.append('filename', file.name)
      form.append('language', language)
      form.append('use_placeholder', String(usePlaceholder))
      const { data } = await api.post<FullAnalysisResult>('/full-analysis', form, {
        timeout: 30 * 60 * 1000,
      })
      return data
    }
    const form = new FormData()
    form.append('file', file)
    form.append('language', language)
    form.append('use_placeholder', String(usePlaceholder))
    const { data } = await api.post<FullAnalysisResult>('/full-analysis', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30 * 60 * 1000,
      onUploadProgress(evt) {
        if (evt.total) {
          onProgress?.(Math.round((evt.loaded / evt.total) * 100))
        }
      },
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fullAnalysisYoutube({
  url,
  language,
  usePlaceholder,
}: FullAnalysisYoutubeOptions): Promise<FullAnalysisResult> {
  try {
    const { data } = await api.post<FullAnalysisResult>('/full-analysis/youtube', {
      url,
      language,
      use_placeholder: usePlaceholder,
    }, {
      timeout: 30 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Dashboard API ────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const { data } = await api.get<DashboardData>('/dashboard')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchHistory(limit = 50, eventType?: string): Promise<HistoryData> {
  try {
    const { data } = await api.get<HistoryData>('/history', {
      params: {
        limit,
        event_type: eventType || undefined,
      },
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── LLM Feedback API (Minimax) ──────────────────────────────────────────

/**
 * Generate teacher feedback from analysis data via Minimax LLM
 */
export async function generateFeedback(body: FeedbackRequest): Promise<FeedbackResult> {
  try {
    const { data } = await api.post<FeedbackResult>('/feedback', body, {
      timeout: 5 * 60 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── MiniMax TTS API ──────────────────────────────────────────────────────

/** Request options for TTS generation */
export interface TTSOptions {
  text: string
  voice_id?: string
  speed?: number
  emotion?: string
  language_boost?: string
}

/**
 * Generate speech audio from text using MiniMax TTS
 * Returns an audio URL playable in the browser
 */
export async function generateTTS(opts: TTSOptions): Promise<TTSResult> {
  try {
    const { data } = await api.post<TTSResult>('/tts', opts, {
      timeout: 60 * 1000, // 1 min
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/** Fetch available TTS voices */
export async function getTTSVoices(): Promise<{ voices: TTSVoice[]; emotions: string[] }> {
  try {
    const { data } = await api.get<{ voices: TTSVoice[]; emotions: string[] }>('/tts/voices')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── MiniMax Video Generation API ─────────────────────────────────────────

/** Request options for video generation */
export interface VideoGenOptions {
  prompt: string
  duration?: number
  resolution?: string
  model?: string
}

/**
 * Create a video generation task
 * Returns task_id for polling status
 */
export async function generateVideo(opts: VideoGenOptions): Promise<{ task_id: string }> {
  try {
    const { data } = await api.post<{ task_id: string }>('/video/generate', opts, {
      timeout: 30 * 1000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

/**
 * Query video generation task status
 * When status is 'Success', download_url will be available
 */
export async function getVideoStatus(taskId: string): Promise<VideoGenResult> {
  try {
    const { data } = await api.get<VideoGenResult>(`/video/status/${taskId}`)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Teacher API ──────────────────────────────────────────────────────────

export async function createTeacher(id: string, name: string, subject: string = ''): Promise<Teacher> {
  try {
    const { data } = await api.post<Teacher>('/teachers', { id, name, subject })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchTeachers(): Promise<Teacher[]> {
  try {
    const { data } = await api.get<Teacher[]>('/teachers')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchTeacherTimeline(teacherId: string): Promise<TeacherTimeline> {
  try {
    const { data } = await api.get<TeacherTimeline>(`/teachers/${teacherId}/timeline`)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Analysis Storage API ─────────────────────────────────────────────────

export interface SaveAnalysisOpts {
  analysis_id: string
  teacher_id: string
  teacher_name: string
  lesson_title: string
  lesson_date: string
  scores: Record<string, number>
  payload: Record<string, unknown>
}

export async function saveAnalysis(opts: SaveAnalysisOpts): Promise<AnalysisDetail> {
  try {
    const { data } = await api.post<AnalysisDetail>('/analyses', opts)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchAnalyses(teacherId?: string): Promise<AnalysisDetail[]> {
  try {
    const params: Record<string, string> = {}
    if (teacherId) params.teacher_id = teacherId
    const { data } = await api.get<AnalysisDetail[]>('/analyses', { params })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchAnalysis(id: string): Promise<AnalysisDetail> {
  try {
    const { data } = await api.get<AnalysisDetail>(`/analyses/${id}`)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Rubric API ───────────────────────────────────────────────────────────

export interface CreateRubricOpts {
  name: string
  dimensions: RubricDimension[]
  teacher_id?: string | null
}

export async function createRubric(opts: CreateRubricOpts): Promise<Rubric> {
  try {
    const { data } = await api.post<Rubric>('/rubrics', opts)
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function fetchRubrics(teacherId?: string): Promise<Rubric[]> {
  try {
    const params: Record<string, string> = {}
    if (teacherId) params.teacher_id = teacherId
    const { data } = await api.get<Rubric[]>('/rubrics', { params })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

export async function deleteRubric(rubricId: string): Promise<void> {
  try {
    await api.delete(`/rubrics/${rubricId}`)
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Share Link API ───────────────────────────────────────────────────────

export async function createShareLink(analysisId: string, days: number = 30): Promise<ShareLink> {
  try {
    const { data } = await api.post<ShareLink>('/shares', { analysis_id: analysisId, days })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Comparison API ───────────────────────────────────────────────────────

export async function compareAnalyses(ids: string[]): Promise<ComparisonResult> {
  try {
    const { data } = await api.post<ComparisonResult>('/comparison', { analysis_ids: ids })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── PDF Export API ───────────────────────────────────────────────────────

export async function exportPDF(analysisId: string, opts?: {
  include_body_language?: boolean
  include_knowledge_points?: boolean
  include_transcript?: boolean
}): Promise<Blob> {
  try {
    const { data } = await api.post('/export/pdf', {
      analysis_id: analysisId,
      include_body_language: opts?.include_body_language ?? true,
      include_knowledge_points: opts?.include_knowledge_points ?? true,
      include_transcript: opts?.include_transcript ?? false,
    }, {
      responseType: 'blob',
      timeout: 30_000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── AI Coaching API ──────────────────────────────────────────────────────

export async function fetchCoachingPlan(teacherId: string): Promise<CoachingPlan> {
  try {
    const { data } = await api.post<CoachingPlan>('/coaching/suggestions', { teacher_id: teacherId }, {
      timeout: 30_000,
    })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── Seed / Demo Data API ─────────────────────────────────────────────────

export interface SeedResult {
  teachers_created: number
  analyses_created: number
  rubrics_created: number
  message: string
}

export async function seedDemoData(): Promise<SeedResult> {
  try {
    const { data } = await api.post<SeedResult>('/seed-demo')
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}

// ── ASI One Chat ────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  reply: string
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
): Promise<ChatResponse> {
  try {
    const { data } = await api.post<ChatResponse>('/chat', { message, history })
    return data
  } catch (err) {
    throw new Error(extractError(err))
  }
}
