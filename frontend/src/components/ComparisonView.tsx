/**
 * Comparison View Component
 *
 * Side-by-side comparison of multiple teaching analyses
 * with visual score bars and difference highlighting.
 */
import { useState, useEffect } from 'react'
import { GitCompareArrows, Search, X } from 'lucide-react'
import { fetchAnalyses, compareAnalyses } from '../services/api'
import type { AnalysisDetail, ComparisonResult, ComparisonItem } from '../types'

const SCORE_KEYS = [
  { key: 'overall_score', label: 'Overall' },
  { key: 'pace_score', label: 'Pace' },
  { key: 'body_score', label: 'Body Language' },
  { key: 'clarity_score', label: 'Clarity' },
  { key: 'engagement_score', label: 'Engagement' },
] as const

const COLORS = ['#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6']

export default function ComparisonView() {
  const [analyses, setAnalyses] = useState<AnalysisDetail[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalyses()
  }, [])

  const loadAnalyses = async () => {
    try {
      const data = await fetchAnalyses()
      setAnalyses(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analyses')
    } finally {
      setLoadingList(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      setError('Select at least 2 analyses to compare')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await compareAnalyses(selectedIds)
      setComparison(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  const getBarWidth = (score: number, max = 100) => `${Math.min((score / max) * 100, 100)}%`

  const renderScoreComparison = (items: ComparisonItem[]) => {
    return SCORE_KEYS.map(({ key, label }) => (
      <div key={key} className="compare-metric-group">
        <div className="compare-metric-label">{label}</div>
        <div className="compare-bars">
          {items.map((item, idx) => {
            const score = item[key as keyof ComparisonItem] as number
            return (
              <div key={item.id} className="compare-bar-row">
                <span className="compare-bar-name" style={{ color: COLORS[idx % COLORS.length] }}>
                  {item.teacher_name}
                </span>
                <div className="compare-bar-track">
                  <div
                    className="compare-bar-fill"
                    style={{
                      width: getBarWidth(score),
                      background: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
                <span className="compare-bar-score">{score}</span>
              </div>
            )
          })}
        </div>
      </div>
    ))
  }

  const renderRadarChart = (items: ComparisonItem[]) => {
    const size = 200
    const cx = size / 2
    const cy = size / 2
    const radius = 80
    const metrics = SCORE_KEYS

    const angleStep = (2 * Math.PI) / metrics.length

    // Background grid
    const gridLevels = [20, 40, 60, 80, 100]

    return (
      <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridLevels.map(level => (
          <polygon
            key={level}
            points={metrics.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2
              const r = (level / 100) * radius
              return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
            }).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
          />
        ))}
        {/* Axis labels */}
        {metrics.map((m, i) => {
          const angle = i * angleStep - Math.PI / 2
          const lx = cx + (radius + 16) * Math.cos(angle)
          const ly = cy + (radius + 16) * Math.sin(angle)
          return (
            <text
              key={m.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill="currentColor"
              opacity="0.7"
            >
              {m.label}
            </text>
          )
        })}
        {/* Data polygons */}
        {items.map((item, idx) => {
          const points = metrics.map((m, i) => {
            const angle = i * angleStep - Math.PI / 2
            const score = item[m.key as keyof ComparisonItem] as number
            const r = (score / 100) * radius
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
          }).join(' ')
          return (
            <polygon
              key={item.id}
              points={points}
              fill={COLORS[idx % COLORS.length]}
              fillOpacity="0.15"
              stroke={COLORS[idx % COLORS.length]}
              strokeWidth="2"
            />
          )
        })}
      </svg>
    )
  }

  return (
    <div className="comparison-view">
      {/* ── Selection Panel ─────────────────────── */}
      <div className="glass-card comparison-selector">
        <h3><Search size={18} /> Select Analyses to Compare</h3>
        {loadingList ? (
          <div className="loading-shimmer">Loading…</div>
        ) : analyses.length === 0 ? (
          <p className="empty-state">
            No saved analyses yet. Run a full analysis and save it to enable comparison.
          </p>
        ) : (
          <>
            <div className="analysis-selection-list">
              {analyses.map(a => (
                <div
                  key={a.id}
                  className={`analysis-select-item ${selectedIds.includes(a.id) ? 'selected' : ''}`}
                  onClick={() => toggleSelect(a.id)}
                >
                  <div className="select-indicator">
                    {selectedIds.includes(a.id) ? '✓' : '○'}
                  </div>
                  <div className="select-info">
                    <strong>{a.teacher_name}</strong>
                    <span>{a.lesson_title}</span>
                    <small>{a.lesson_date}</small>
                  </div>
                  <div className="select-score">{a.overall_score}</div>
                </div>
              ))}
            </div>
            <div className="compare-actions">
              <span>{selectedIds.length} selected</span>
              {selectedIds.length > 0 && (
                <button className="btn-secondary" onClick={() => setSelectedIds([])}>
                  <X size={14} /> Clear
                </button>
              )}
              <button
                className="btn-primary"
                onClick={handleCompare}
                disabled={selectedIds.length < 2 || loading}
              >
                <GitCompareArrows size={16} />
                {loading ? 'Comparing…' : 'Compare'}
              </button>
            </div>
          </>
        )}
        {error && <div className="error-msg">{error}</div>}
      </div>

      {/* ── Comparison Results ──────────────────── */}
      {comparison && (
        <div className="comparison-results">
          {/* Radar Chart */}
          <div className="glass-card comparison-radar">
            <h3>Performance Radar</h3>
            {renderRadarChart(comparison.items)}
            <div className="radar-legend">
              {comparison.items.map((item, idx) => (
                <span key={item.id} className="legend-item">
                  <span className="legend-dot" style={{ background: COLORS[idx % COLORS.length] }} />
                  {item.teacher_name} — {item.lesson_title}
                </span>
              ))}
            </div>
          </div>

          {/* Bar Comparison */}
          <div className="glass-card comparison-bars-section">
            <h3>Score Comparison</h3>
            {renderScoreComparison(comparison.items)}
          </div>

          {/* Differences */}
          <div className="glass-card comparison-diffs">
            <h3>Score Gaps</h3>
            <div className="diff-grid">
              {Object.entries(comparison.score_differences).map(([key, diff]) => {
                const label = SCORE_KEYS.find(s => s.key === key)?.label || key
                return (
                  <div key={key} className="diff-item">
                    <span className="diff-label">{label}</span>
                    <span className={`diff-value ${diff > 10 ? 'large-gap' : ''}`}>
                      Δ {diff}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
