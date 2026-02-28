/**
 * PDF Export Modal Component
 *
 * Allows users to configure and download a PDF report from a saved analysis.
 */
import { useState } from 'react'
import { FileDown, X, FileText, Eye, BookOpen } from 'lucide-react'
import { exportPDF, fetchAnalyses } from '../services/api'
import type { AnalysisDetail } from '../types'

interface PDFExportModalProps {
  /** Pre-selected analysis ID */
  analysisId?: string
  onClose: () => void
}

export default function PDFExportModal({ analysisId, onClose }: PDFExportModalProps) {
  const [analyses, setAnalyses] = useState<AnalysisDetail[]>([])
  const [selectedId, setSelectedId] = useState(analysisId || '')
  const [includeBody, setIncludeBody] = useState(true)
  const [includeKP, setIncludeKP] = useState(true)
  const [includeTranscript, setIncludeTranscript] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const loadAnalyses = async () => {
    if (loaded) return
    try {
      const data = await fetchAnalyses()
      setAnalyses(data)
      setLoaded(true)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analyses')
    }
  }

  // Load analyses on mount
  if (!loaded && !error) {
    loadAnalyses()
  }

  const handleExport = async () => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const blob = await exportPDF(selectedId, {
        include_body_language: includeBody,
        include_knowledge_points: includeKP,
        include_transcript: includeTranscript,
      })
      // Trigger browser download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${selectedId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><FileDown size={20} /> Export PDF Report</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* Analysis selector */}
          <label className="form-label">Select Analysis</label>
          <select
            className="form-select"
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
          >
            <option value="">-- Choose analysis --</option>
            {analyses.map(a => (
              <option key={a.id} value={a.id}>
                {a.teacher_name} — {a.lesson_title} ({a.lesson_date})
              </option>
            ))}
          </select>

          {/* Include options */}
          <div className="export-options">
            <label className="checkbox-label">
              <input type="checkbox" checked={includeBody} onChange={e => setIncludeBody(e.target.checked)} />
              <Eye size={14} /> Body Language Analysis
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={includeKP} onChange={e => setIncludeKP(e.target.checked)} />
              <BookOpen size={14} /> Knowledge Points
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={includeTranscript} onChange={e => setIncludeTranscript(e.target.checked)} />
              <FileText size={14} /> Full Transcript
            </label>
          </div>

          {error && <div className="error-msg">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={!selectedId || loading}
          >
            {loading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
