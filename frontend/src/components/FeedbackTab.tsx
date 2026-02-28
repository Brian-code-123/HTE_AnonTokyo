/**
 * FeedbackTab Component
 *
 * Allows users to paste transcript/body language data and request
 * AI-generated teacher feedback via the Minimax LLM endpoint.
 */
import { useState } from 'react'
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Eye,
  ClipboardList,
} from 'lucide-react'
import { generateFeedback } from '../services/api'
import type { FeedbackRequest, FeedbackResult } from '../types'

export default function FeedbackTab() {
  const [transcript, setTranscript]         = useState('')
  const [bodyLanguage, setBodyLanguage]     = useState('')
  const [rubric, setRubric]                 = useState('')
  const [extraContext, setExtraContext]     = useState('')
  const [loading, setLoading]               = useState(false)
  const [result, setResult]                 = useState<FeedbackResult | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [copied, setCopied]                 = useState(false)

  const canSubmit = (transcript.trim() || bodyLanguage.trim() || rubric.trim()) && !loading

  const handleSubmit = async () => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const body: FeedbackRequest = {
        transcript:             transcript.trim() || undefined,
        body_language_report:   bodyLanguage.trim() || undefined,
        rubric_evaluation:      rubric.trim() || undefined,
        additional_context:     extraContext.trim() || undefined,
      }
      const data = await generateFeedback(body)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!result) return
    navigator.clipboard.writeText(result.feedback)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setTranscript('')
    setBodyLanguage('')
    setRubric('')
    setExtraContext('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="feedback-tab">
      {/* Hero */}
      <section className="hero compact">
        <div className="hero-eyebrow">🤖 Minimax LLM</div>
        <h1>AI Teacher Feedback</h1>
        <p className="hero-desc">
          Paste your transcript, body language notes, or rubric — and receive
          personalised AI-generated coaching feedback instantly.
        </p>
      </section>

      <div className="glass-card feedback-card">
        <div className="feedback-inputs">
          {/* Transcript */}
          <div className="fb-field">
            <label className="fb-label">
              <BookOpen size={14} />
              Transcript
            </label>
            <textarea
              className="fb-textarea"
              rows={5}
              placeholder="Paste your lesson transcript here…"
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Body Language */}
          <div className="fb-field">
            <label className="fb-label">
              <Eye size={14} />
              Body Language Notes
              <span className="fb-optional">optional</span>
            </label>
            <textarea
              className="fb-textarea"
              rows={4}
              placeholder="Paste body language analysis report (optional)…"
              value={bodyLanguage}
              onChange={e => setBodyLanguage(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Rubric */}
          <div className="fb-field">
            <label className="fb-label">
              <ClipboardList size={14} />
              Rubric Evaluation
              <span className="fb-optional">optional</span>
            </label>
            <textarea
              className="fb-textarea"
              rows={4}
              placeholder="Paste the rubric or evaluation criteria (optional)…"
              value={rubric}
              onChange={e => setRubric(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Extra context */}
          <div className="fb-field">
            <label className="fb-label">
              <MessageSquare size={14} />
              Additional Context
              <span className="fb-optional">optional</span>
            </label>
            <textarea
              className="fb-textarea"
              rows={2}
              placeholder="Subject, grade level, focus areas, etc…"
              value={extraContext}
              onChange={e => setExtraContext(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="fb-actions">
          <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            {loading
              ? <><Loader2 size={17} className="db-spinner" /> Generating…</>
              : <><Send size={17} /> Generate Feedback</>
            }
          </button>
          {(result || error) && (
            <button className="btn-reset" onClick={handleReset}>
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner" style={{ margin: '0 1.5rem 1.5rem' }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="fb-result">
            <div className="fb-result-header">
              <span className="fb-result-title">
                <Sparkles size={16} />
                AI Feedback
              </span>
              <div className="fb-result-meta">
                <span className="meta-chip">{result.model}</span>
                <button className="btn-download" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="fb-result-body">
              {result.feedback}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
