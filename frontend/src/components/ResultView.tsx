/**
 * Result View Component
 *
 * Displays transcription results with multiple view modes:
 * - Full transcript text view
 * - Timestamped segments with timeline
 * - SRT subtitle format preview
 * - AI Feedback (on-demand generation from transcript)
 * - Download options for each format
 */
import { useState } from 'react'
import {
  FileText,
  Clock,
  Globe,
  Download,
  RotateCcw,
  CheckCircle,
  AlignLeft,
  List,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import type { TranscriptResult } from '../types'
import { generateFeedback } from '../services/api'

interface ResultViewProps {
  /** Complete transcription result from API */
  result: TranscriptResult
  /** Callback to reset application and start new transcription */
  onReset: () => void
}

/** Available views for displaying transcription results */
type ViewTab = 'text' | 'segments' | 'srt' | 'feedback'

/**
 * Format duration in seconds to human-readable format (e.g., "2m 45s")
 */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s}s`
}

/**
 * Format absolute timestamp in seconds to HH:MM:SS format
 * Omits hours if less than 1 hour (shows MM:SS format)
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Trigger a file download using Blob and URL API
 * @param content - File content string
 * @param filename - Desired filename for download
 * @param mime - MIME type (e.g., 'text/plain', 'text/srt')
 */
function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ResultView({ result, onReset }: ResultViewProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('text')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackModel, setFeedbackModel] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  const wordCount = result.full_text.trim().split(/\s+/).filter(Boolean).length

  async function handleGenerateFeedback() {
    setFeedbackLoading(true)
    setFeedbackError(null)
    try {
      const res = await generateFeedback({
        transcript: result.full_text,
      })
      setFeedback(res.feedback)
      setFeedbackModel(res.model)
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : 'Failed to generate feedback')
    } finally {
      setFeedbackLoading(false)
    }
  }

  return (
    <div className="glass-card result-section">
      {/* Header */}
      <div className="result-header">
        <div className="result-title">
          <CheckCircle />
          Transcription Complete
        </div>
        <div className="result-meta">
          <span className="meta-chip">
            <Globe /> {result.language.toUpperCase()}
          </span>
          <span className="meta-chip">
            <Clock /> {formatDuration(result.duration)}
          </span>
          <span className="meta-chip">
            <FileText /> {wordCount.toLocaleString()} words
          </span>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        <button
          className={`view-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlignLeft size={13} /> Full Text
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'segments' ? 'active' : ''}`}
          onClick={() => setActiveTab('segments')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <List size={13} /> Segments ({result.segments.length})
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'srt' ? 'active' : ''}`}
          onClick={() => setActiveTab('srt')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileText size={13} /> SRT Preview
          </span>
        </button>
        <button
          className={`view-tab ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MessageSquare size={13} /> AI Feedback
            {feedback && <CheckCircle size={11} style={{ color: 'var(--accent-primary)' }} />}
          </span>
        </button>
      </div>

      {/* Text view */}
      {activeTab === 'text' && (
        <div className="transcript-box">{result.full_text}</div>
      )}

      {/* Segments view */}
      {activeTab === 'segments' && (
        <div className="segments-list">
          {result.segments.map((seg, i) => (
            <div className="segment-row" key={i}>
              <span className="segment-time">{formatTime(seg.start)}</span>
              <span className="segment-time" style={{ opacity: 0.55 }}>
                {formatTime(seg.end)}
              </span>
              <span className="segment-text">{seg.text.trim()}</span>
            </div>
          ))}
        </div>
      )}

      {/* SRT view */}
      {activeTab === 'srt' && (
        <div className="transcript-box" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
          {result.srt_content}
        </div>
      )}

      {/* AI Feedback view */}
      {activeTab === 'feedback' && (
        <div className="feedback-panel" style={{ padding: '1rem 0' }}>
          {!feedback && !feedbackLoading && (
            <div className="feedback-prompt">
              <p className="feedback-prompt-text">
                Generate AI feedback on the transcript — teaching quality, clarity, and suggestions for improvement.
              </p>
              <button
                className="btn-generate-feedback"
                onClick={handleGenerateFeedback}
                disabled={feedbackLoading}
              >
                <MessageSquare size={16} />
                Generate AI Feedback
              </button>
            </div>
          )}
          {feedbackLoading && (
            <div className="feedback-loading">
              <Loader2 size={24} className="spinner" />
              <p>Generating feedback&hellip;</p>
              <p className="feedback-loading-sub">This may take a minute.</p>
            </div>
          )}
          {feedbackError && (
            <div className="feedback-error">
              <p>{feedbackError}</p>
              <button className="btn-generate-feedback" onClick={handleGenerateFeedback}>
                Retry
              </button>
            </div>
          )}
          {feedback && (
            <>
              {feedbackModel && (
                <div className="feedback-meta" style={{ marginBottom: '0.5rem' }}>
                  <span className="meta-chip">{feedbackModel}</span>
                </div>
              )}
              <div className="transcript-box" style={{ maxHeight: '500px', whiteSpace: 'pre-wrap' }}>
                {feedback}
              </div>
            </>
          )}
        </div>
      )}

      {/* Download buttons */}
      <div className="download-row">
        <button
          className="btn-download"
          onClick={() => downloadBlob(result.full_text, 'transcript.txt', 'text/plain')}
        >
          <Download /> Download .txt
        </button>
        <button
          className="btn-download"
          onClick={() => downloadBlob(result.srt_content, 'transcript.srt', 'text/plain')}
        >
          <Download /> Download .srt
        </button>
        {feedback && (
          <button
            className="btn-download"
            onClick={() => downloadBlob(feedback, 'ai_feedback.md', 'text/markdown')}
          >
            <Download /> Feedback .md
          </button>
        )}
        <button
          className="btn-download"
          onClick={() =>
            downloadBlob(
              JSON.stringify(result, null, 2),
              'transcript.json',
              'application/json',
            )
          }
        >
          <Download /> Download .json
        </button>
        <button className="btn-reset" onClick={onReset}>
          <RotateCcw /> New Transcription
        </button>
      </div>
    </div>
  )
}
