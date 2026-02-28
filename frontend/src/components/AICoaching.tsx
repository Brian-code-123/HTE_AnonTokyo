/**
 * AI Coaching Component
 *
 * Shows personalised improvement suggestions based on teacher
 * trend data. Includes a "Seed Demo Data" button so users can
 * see meaningful results immediately.
 */
import { useState, useEffect } from 'react'
import {
  Brain, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle2, Target, Loader2, Database,
  Users,
} from 'lucide-react'
import { fetchTeachers, fetchCoachingPlan, seedDemoData } from '../services/api'
import type { Teacher, CoachingPlan } from '../types'

const PRIORITY_CONFIG = {
  high:   { color: '#ef4444', bg: '#ef444418', icon: AlertTriangle, label: 'High Priority' },
  medium: { color: '#f59e0b', bg: '#f59e0b18', icon: Target,        label: 'Medium Priority' },
  low:    { color: '#22c55e', bg: '#22c55e18', icon: CheckCircle2,   label: 'On Track' },
}

export default function AICoaching() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [plan, setPlan] = useState<CoachingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    loadTeachers()
  }, [])

  const loadTeachers = async () => {
    try {
      const data = await fetchTeachers()
      setTeachers(data)
      if (data.length > 0 && !selectedTeacher) setSelectedTeacher(data[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load teachers')
    } finally {
      setLoadingTeachers(false)
    }
  }

  const handleGenerate = async () => {
    if (!selectedTeacher) return
    setLoading(true)
    setError('')
    setPlan(null)
    try {
      const data = await fetchCoachingPlan(selectedTeacher)
      setPlan(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate coaching plan')
    } finally {
      setLoading(false)
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedMsg('')
    try {
      const r = await seedDemoData()
      setSeedMsg(r.message)
      await loadTeachers()
    } catch (e) {
      setSeedMsg(e instanceof Error ? e.message : 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const TrendIcon = ({ v }: { v: number }) =>
    v > 0.2 ? <TrendingUp size={14} style={{ color: '#22c55e' }} />
    : v < -0.2 ? <TrendingDown size={14} style={{ color: '#ef4444' }} />
    : <Minus size={14} style={{ color: '#94a3b8' }} />

  return (
    <div className="coaching-root">
      {/* Teacher selector */}
      <div className="glass-card coaching-selector">
        <div className="coaching-selector-row">
          <Users size={16} />
          {loadingTeachers ? (
            <span className="coaching-muted">Loading teachers…</span>
          ) : teachers.length === 0 ? (
            <span className="coaching-muted">No teachers found.</span>
          ) : (
            <select
              className="coaching-select"
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
            >
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name} — {t.subject || 'General'}</option>
              ))}
            </select>
          )}

          <button
            className="coaching-btn primary"
            onClick={handleGenerate}
            disabled={loading || !selectedTeacher}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Brain size={14} />}
            {loading ? 'Generating…' : 'Generate Coaching Plan'}
          </button>

          <button
            className="coaching-btn secondary"
            onClick={handleSeed}
            disabled={seeding}
          >
            {seeding ? <Loader2 size={14} className="spin" /> : <Database size={14} />}
            {seeding ? 'Seeding…' : 'Seed Demo Data'}
          </button>
        </div>

        {seedMsg && <div className="coaching-seed-msg">{seedMsg}</div>}
        {error && <div className="coaching-error">{error}</div>}
      </div>

      {/* Coaching plan */}
      {plan && (
        <div className="coaching-plan">
          {/* Summary */}
          <div className="glass-card coaching-summary">
            <h2>
              <Brain size={18} />
              Coaching Plan for {plan.teacher_name}
            </h2>
            <p>{plan.overall_summary}</p>
            <span className="coaching-ts">Generated: {new Date(plan.generated_at).toLocaleString()}</span>
          </div>

          {/* Suggestion cards */}
          {plan.suggestions.length === 0 && (
            <div className="glass-card coaching-empty">
              <p>No data available yet. Add lesson analyses or seed demo data to get coaching suggestions.</p>
            </div>
          )}

          <div className="coaching-grid">
            {plan.suggestions.map((s, i) => {
              const cfg = PRIORITY_CONFIG[s.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.low
              const Icon = cfg.icon
              return (
                <div key={i} className="glass-card coaching-card" style={{ borderLeftColor: cfg.color }}>
                  <div className="coaching-card-header">
                    <span className="coaching-badge" style={{ background: cfg.bg, color: cfg.color }}>
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                    <span className="coaching-score">
                      {s.current_score}/100
                      <TrendIcon v={s.trend} />
                    </span>
                  </div>

                  <h3 className="coaching-area">{s.area}</h3>
                  <p className="coaching-desc">{s.suggestion}</p>

                  <ul className="coaching-actions">
                    {s.action_items.map((item, j) => (
                      <li key={j}>
                        <CheckCircle2 size={12} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
