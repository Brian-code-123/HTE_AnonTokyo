import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import type { KnowledgePointReport } from '../types'

interface Props {
  report: KnowledgePointReport
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function scoreBadge(score: number, label: string) {
  const colors: Record<number, string> = {
    1: 'var(--error)',
    2: 'var(--warning)',
    3: 'var(--accent-primary)',
    4: 'var(--success)',
  }
  const labels: Record<number, string> = {
    1: 'Needs Improvement',
    2: 'Adequate',
    3: 'Good',
    4: 'Excellent',
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.3rem',
      padding: '0.15rem 0.55rem',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: colors[score] ?? 'var(--text-muted)',
      color: '#fff',
    }}>
      {label}: {score}/4 — {labels[score] ?? ''}
    </span>
  )
}

export default function KnowledgePointsView({ report }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        <span><strong>{report.points.length}</strong> knowledge points identified</span>
        <span>Avg Content: <strong>{report.avg_content_score.toFixed(1)}</strong>/4</span>
        <span>Avg Presentation: <strong>{report.avg_presentation_score.toFixed(1)}</strong>/4</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {report.points.map((kp, idx) => {
          const isExpanded = expandedIdx === idx
          return (
            <div key={idx} style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  background: isExpanded ? 'var(--accent-soft)' : 'var(--bg-surface)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <span style={{
                  fontWeight: 600,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {idx + 1}. {kp.topic}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatTime(kp.timestamp_start)} – {formatTime(kp.timestamp_end)}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  {scoreBadge(kp.content_score, 'C')}
                  {scoreBadge(kp.presentation_score, 'P')}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isExpanded && (
                <div style={{
                  padding: '1rem 1.25rem',
                  background: 'var(--bg-surface)',
                  fontSize: '0.85rem',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      Content Analysis {scoreBadge(kp.content_score, 'Score')}
                    </div>
                    <p style={{ margin: 0 }}>{kp.content_analysis}</p>
                  </div>

                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      Presentation Analysis {scoreBadge(kp.presentation_score, 'Score')}
                    </div>
                    <p style={{ margin: 0 }}>{kp.presentation_analysis}</p>
                  </div>

                  {kp.transcript_excerpt && (
                    <details style={{ marginTop: '0.25rem' }}>
                      <summary style={{
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}>
                        Transcript Excerpt
                      </summary>
                      <p style={{
                        margin: '0.35rem 0 0',
                        fontStyle: 'italic',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                      }}>
                        "{kp.transcript_excerpt}"
                      </p>
                    </details>
                  )}

                  {kp.suggestions.length > 0 && (
                    <div style={{
                      padding: '0.6rem 0.75rem',
                      background: 'var(--accent-soft)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--accent-primary)',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        color: 'var(--accent-primary)',
                        marginBottom: '0.25rem',
                      }}>
                        <Lightbulb size={13} /> Suggestions
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem' }}>
                        {kp.suggestions.map((s, si) => (
                          <li key={si}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
