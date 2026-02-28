/**
 * Teacher Timeline Component
 *
 * Displays longitudinal tracking of a teacher's performance over time
 * with trend charts and aggregated metrics.
 */
import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Users, BarChart3, Award, Calendar } from 'lucide-react'
import { fetchTeachers, createTeacher, fetchTeacherTimeline, saveAnalysis } from '../services/api'
import type { Teacher, TeacherTimeline as TTimeline, AnalysisSummary } from '../types'

export default function TeacherTimelineView() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [timeline, setTimeline] = useState<TTimeline | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [error, setError] = useState('')

  // New teacher form
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSubject, setNewSubject] = useState('')

  // Demo data form
  const [showAddDemo, setShowAddDemo] = useState(false)

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const data = await fetchTeachers()
      setTeachers(data)
      if (data.length > 0 && !selectedTeacher) {
        setSelectedTeacher(data[0].id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teachers')
    } finally {
      setLoadingTeachers(false)
    }
  }

  const loadTimeline = async (teacherId: string) => {
    if (!teacherId) return
    setLoading(true)
    setError('')
    setTimeline(null)
    try {
      const data = await fetchTeacherTimeline(teacherId)
      setTimeline(data)
    } catch {
      // No data yet
      setTimeline(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTeacher) {
      loadTimeline(selectedTeacher)
    }
  }, [selectedTeacher])

  const handleAddTeacher = async () => {
    if (!newName.trim()) return
    try {
      const id = crypto.randomUUID().slice(0, 12)
      await createTeacher(id, newName, newSubject)
      setNewName('')
      setNewSubject('')
      setShowAddTeacher(false)
      await loadTeachers()
      setSelectedTeacher(id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add teacher')
    }
  }

  const addDemoData = async () => {
    if (!selectedTeacher) return
    const teacher = teachers.find(t => t.id === selectedTeacher)
    if (!teacher) return
    try {
      const lessons = [
        { title: 'Introduction to Algebra', date: '2024-09-01', scores: { overall: 72, pace: 70, body: 68, clarity: 75, engagement: 74 } },
        { title: 'Linear Equations', date: '2024-09-15', scores: { overall: 75, pace: 73, body: 70, clarity: 78, engagement: 76 } },
        { title: 'Quadratic Functions', date: '2024-10-01', scores: { overall: 78, pace: 76, body: 74, clarity: 80, engagement: 79 } },
        { title: 'Geometry Basics', date: '2024-10-15', scores: { overall: 80, pace: 78, body: 77, clarity: 82, engagement: 81 } },
        { title: 'Trigonometry', date: '2024-11-01', scores: { overall: 83, pace: 81, body: 80, clarity: 85, engagement: 84 } },
        { title: 'Calculus Preview', date: '2024-11-15', scores: { overall: 86, pace: 84, body: 83, clarity: 88, engagement: 85 } },
      ]
      for (const lesson of lessons) {
        await saveAnalysis({
          analysis_id: crypto.randomUUID().slice(0, 12),
          teacher_id: selectedTeacher,
          teacher_name: teacher.name,
          lesson_title: lesson.title,
          lesson_date: lesson.date,
          scores: lesson.scores,
          payload: {},
        })
      }
      setShowAddDemo(false)
      await loadTimeline(selectedTeacher)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add demo data')
    }
  }

  const renderTrend = (value: number) => {
    if (value > 0) return <span className="trend-up"><TrendingUp size={14} /> +{value}</span>
    if (value < 0) return <span className="trend-down"><TrendingDown size={14} /> {value}</span>
    return <span className="trend-flat">→ 0</span>
  }

  const renderScoreBar = (score: number, max = 100) => {
    const pct = (score / max) * 100
    const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
    return (
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="score-bar-label">{score}</span>
      </div>
    )
  }

  const renderMiniChart = (analyses: AnalysisSummary[]) => {
    if (analyses.length < 2) return null
    const maxScore = Math.max(...analyses.map(a => a.overall_score), 100)
    const minScore = Math.min(...analyses.map(a => a.overall_score), 0)
    const range = maxScore - minScore || 1
    const width = 300
    const height = 80
    const points = analyses.map((a, i) => {
      const x = (i / (analyses.length - 1)) * width
      const y = height - ((a.overall_score - minScore) / range) * height
      return `${x},${y}`
    }).join(' ')

    return (
      <svg className="mini-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#chartGrad)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
        />
        {analyses.map((a, i) => {
          const x = (i / (analyses.length - 1)) * width
          const y = height - ((a.overall_score - minScore) / range) * height
          return <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" />
        })}
      </svg>
    )
  }

  return (
    <div className="teacher-timeline">
      {/* ── Teacher Selector ──────────────────────── */}
      <div className="timeline-controls glass-card">
        <div className="teacher-select-row">
          <Users size={18} />
          {loadingTeachers ? (
            <span>Loading…</span>
          ) : (
            <select
              className="form-select"
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
            >
              <option value="">-- Select teacher --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} {t.subject ? `(${t.subject})` : ''}</option>
              ))}
            </select>
          )}
          <button className="btn-secondary" onClick={() => setShowAddTeacher(!showAddTeacher)}>
            + Add Teacher
          </button>
          {selectedTeacher && (
            <button className="btn-secondary" onClick={() => setShowAddDemo(!showAddDemo)}>
              + Demo Data
            </button>
          )}
        </div>

        {showAddTeacher && (
          <div className="add-teacher-form">
            <input className="form-input" placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
            <input className="form-input" placeholder="Subject" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
            <button className="btn-primary" onClick={handleAddTeacher}>Save</button>
          </div>
        )}

        {showAddDemo && (
          <div className="add-teacher-form">
            <p>Add 6 sample lessons with progressive scores to demonstrate timeline features.</p>
            <button className="btn-primary" onClick={addDemoData}>Generate Demo Data</button>
          </div>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading && <div className="loading-shimmer">Loading timeline…</div>}

      {/* ── No Data State ─────────────────────────── */}
      {!loading && !timeline && selectedTeacher && (
        <div className="glass-card empty-timeline">
          <BarChart3 size={48} />
          <h3>No analyses yet</h3>
          <p>Save an analysis from the Transcribe tab, or add demo data to see the timeline.</p>
        </div>
      )}

      {/* ── Timeline Content ──────────────────────── */}
      {timeline && timeline.aggregated_metrics && (
        <>
          {/* Summary Cards */}
          <div className="metrics-grid">
            <div className="metric-card glass-card">
              <div className="metric-icon"><Calendar size={20} /></div>
              <div className="metric-value">{timeline.total_lessons}</div>
              <div className="metric-label">Total Lessons</div>
            </div>
            <div className="metric-card glass-card">
              <div className="metric-icon"><Award size={20} /></div>
              <div className="metric-value">{timeline.aggregated_metrics.avg_overall}</div>
              <div className="metric-label">Avg Overall</div>
            </div>
            <div className="metric-card glass-card">
              <div className="metric-icon"><TrendingUp size={20} /></div>
              <div className="metric-value">{renderTrend(timeline.aggregated_metrics.trend_overall)}</div>
              <div className="metric-label">Overall Trend</div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="glass-card trend-chart-card">
            <h3><BarChart3 size={18} /> Overall Score Trend</h3>
            {renderMiniChart(timeline.analyses)}
          </div>

          {/* Detailed Metrics */}
          <div className="glass-card detailed-metrics">
            <h3>Metric Breakdown</h3>
            <div className="metric-breakdown">
              {(['pace', 'body', 'clarity', 'engagement'] as const).map(key => {
                const avgKey = `avg_${key}` as keyof typeof timeline.aggregated_metrics
                const trendKey = `trend_${key}` as keyof typeof timeline.aggregated_metrics
                return (
                  <div key={key} className="breakdown-row">
                    <span className="breakdown-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    {renderScoreBar(timeline.aggregated_metrics![avgKey] as number)}
                    <span className="breakdown-trend">
                      {renderTrend(timeline.aggregated_metrics![trendKey] as number)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lesson History */}
          <div className="glass-card lesson-history">
            <h3>Lesson History</h3>
            <div className="lesson-table">
              <div className="lesson-table-header">
                <span>Date</span>
                <span>Title</span>
                <span>Overall</span>
                <span>Pace</span>
                <span>Body</span>
                <span>Clarity</span>
                <span>Engage</span>
              </div>
              {timeline.analyses.map(a => (
                <div key={a.id} className="lesson-table-row">
                  <span>{a.lesson_date}</span>
                  <span>{a.lesson_title}</span>
                  <span className="score-cell">{a.overall_score}</span>
                  <span className="score-cell">{a.pace_score}</span>
                  <span className="score-cell">{a.body_score}</span>
                  <span className="score-cell">{a.clarity_score}</span>
                  <span className="score-cell">{a.engagement_score}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
