import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Activity,
  Cpu,
  ClipboardList,
  MessageSquare,
  Clock,
  RefreshCw,
  Loader2,
  GraduationCap,
  Mic,
  Eye,
  Sparkles,
  ChevronRight,
  Database,
  Filter,
  Hash,
} from 'lucide-react'
import type { DashboardData, HistoryData, HistoryEvent } from '../types'
import { fetchDashboard, fetchHistory } from '../services/api'
import { useScrollRevealGroup, useAnimatedCounter } from '../hooks/useAnimations'

interface Props {
  onNavigate: (tab: string) => void
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

const CAPABILITY_META: Record<string, { icon: typeof Mic; label: string; tab: string }> = {
  'transcription':          { icon: Mic,           label: 'Transcription',           tab: 'for-you' },
  'body-language-analysis': { icon: Eye,           label: 'Body Language Analysis',  tab: 'for-you' },
  'full-analysis':          { icon: GraduationCap, label: 'Full Lesson Analysis',    tab: 'for-you' },
  'ai-feedback':            { icon: MessageSquare, label: 'AI Teacher Feedback',     tab: 'for-you' },
}

export default function Dashboard({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setHistoryError(null)
    try {
      const [d, h] = await Promise.all([
        fetchDashboard(),
        fetchHistory(100, eventTypeFilter || undefined),
      ])
      setData(d)
      setHistory(h)
      setSelectedEventId(prev => prev ?? (h.events[0]?.id ?? null))
      setLastRefresh(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(msg)
      setHistoryError(msg)
    } finally {
      setLoading(false)
    }
  }, [eventTypeFilter])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const configuredCount = data?.services.filter(s => s.configured).length ?? 0
  const totalServices = data?.services.length ?? 0
  const selectedEvent = useMemo<HistoryEvent | null>(() => {
    if (!history?.events?.length) return null
    return history.events.find(e => e.id === selectedEventId) ?? history.events[0]
  }, [history, selectedEventId])
  const eventTypeOptions = useMemo(() => {
    if (!history?.events?.length) return []
    return Array.from(new Set(history.events.map(e => e.event_type))).sort()
  }, [history])

  /* ── animation hooks ──────────────────────────── */
  const statsRef = useScrollRevealGroup<HTMLDivElement>()
  const panelsRef = useScrollRevealGroup<HTMLDivElement>()
  const bottomRef = useScrollRevealGroup<HTMLDivElement>()
  const hasData = !!data
  const transCount = useAnimatedCounter(data?.stats.transcriptions ?? 0, 1000, hasData)
  const analysisCount = useAnimatedCounter(data?.stats.full_analyses ?? 0, 1000, hasData)
  const feedbackCount = useAnimatedCounter(data?.stats.feedback_generated ?? 0, 1000, hasData)

  return (
    <div className="dashboard">
      {/* ── Header row ─────────────────────────────────────────── */}
      <div className="db-header">
        <div>
          <h2 className="db-title">
            <GraduationCap size={22} />
            System Dashboard
          </h2>
          <p className="db-subtitle">
            Live service status &amp; session activity
          </p>
        </div>
        <div className="db-header-right">
          {data && (
            <span className="db-version">v{data.version}</span>
          )}
          <button
            className="db-refresh-btn"
            onClick={load}
            disabled={loading}
            title="Refresh"
          >
            {loading
              ? <Loader2 size={15} className="db-spinner" />
              : <RefreshCw size={15} />
            }
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="db-error">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* ── Stats row ──────────────────────────────────────────── */}
      <div className="db-stats-grid stagger-parent" ref={statsRef}>
        <div className="db-stat-card reveal">
          <div className="db-stat-icon" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
            <Mic size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value animated-number">{hasData ? transCount : '—'}</span>
            <span className="db-stat-label">Transcriptions</span>
          </div>
        </div>

        <div className="db-stat-card reveal">
          <div className="db-stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <ClipboardList size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value animated-number">{hasData ? analysisCount : '—'}</span>
            <span className="db-stat-label">Full Analyses</span>
          </div>
        </div>

        <div className="db-stat-card reveal">
          <div className="db-stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            <MessageSquare size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value animated-number">{hasData ? feedbackCount : '—'}</span>
            <span className="db-stat-label">Feedback Reports</span>
          </div>
        </div>

        <div className="db-stat-card reveal">
          <div className="db-stat-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
            <Clock size={20} />
          </div>
          <div className="db-stat-body">
            <span className="db-stat-value">
              {data ? formatUptime(data.stats.uptime_seconds) : '—'}
            </span>
            <span className="db-stat-label">Server Uptime</span>
          </div>
        </div>
      </div>

      <div className="db-two-col stagger-parent" ref={panelsRef}>
        {/* ── Services ─────────────────────────────────────────── */}
        <div className="glass-card db-panel reveal">
          <h3 className="db-panel-title">
            <Cpu size={16} /> Services
            <span className={`db-service-summary ${configuredCount === totalServices ? 'all-ok' : 'partial'}`}>
              {configuredCount}/{totalServices} configured
            </span>
          </h3>

          {loading && !data && (
            <div className="db-loading-row">
              <Loader2 size={16} className="db-spinner" /> Loading…
            </div>
          )}

          <ul className="db-service-list db-service-list-compact">
            {data?.services.map(svc => (
              <li key={svc.name} className="db-service-item">
                <span className="db-service-dot">
                  {svc.configured
                    ? <CheckCircle2 size={16} className="db-ok" />
                    : <XCircle size={16} className="db-err" />
                  }
                </span>
                <span className="db-service-label">{svc.label}</span>
                <span className={`db-service-badge ${svc.configured ? 'ok' : 'missing'}`}>
                  {svc.configured ? 'Ready' : 'Not configured'}
                </span>
              </li>
            ))}
          </ul>

          {data && (
            <p className="db-refresh-note">
              Last refreshed {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}
        </div>

        {/* ── Capabilities ─────────────────────────────────────── */}
        <div className="glass-card db-panel reveal">
          <h3 className="db-panel-title">
            <Activity size={16} /> Active Capabilities
          </h3>

          {data?.capabilities.length === 0 && (
            <p className="db-empty">
              No services are configured. Add API keys to enable features.
            </p>
          )}

          <ul className="db-cap-list db-cap-list-compact">
            {data?.capabilities.map(cap => {
              const meta = CAPABILITY_META[cap]
              if (!meta) return null
              const Icon = meta.icon
              return (
                <li key={cap} className="db-cap-item">
                  <Icon size={15} className="db-cap-icon" />
                  <span>{meta.label}</span>
                  <CheckCircle2 size={13} className="db-ok" style={{ marginLeft: 'auto' }} />
                </li>
              )
            })}
          </ul>

          {/* Quick actions */}
          {data && data.capabilities.length > 0 && (
            <div className="db-quick-actions">
              <p className="db-panel-subtitle">Quick start</p>
              <button
                className="db-action-btn"
                onClick={() => onNavigate('for-you')}
              >
                <Sparkles size={14} />
                {data.capabilities.includes('full-analysis')
                  ? 'Run Full Analysis'
                  : 'Transcribe a Lesson'
                }
                <ChevronRight size={14} style={{ marginLeft: 'auto' }} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="db-two-col stagger-parent" ref={bottomRef} style={{ marginTop: '1rem' }}>
        <div className="glass-card db-panel reveal">
          <h3 className="db-panel-title">
            <Database size={16} /> Previous Generations & Analytics
            <span className="db-service-summary all-ok">{history?.total ?? 0} records</span>
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
            <Filter size={14} style={{ opacity: 0.7 }} />
            <select
              className="select-input"
              value={eventTypeFilter}
              onChange={e => setEventTypeFilter(e.target.value)}
              style={{ maxWidth: '240px' }}
            >
              <option value="">All event types</option>
              {eventTypeOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {historyError && (
            <div className="db-error">
              <XCircle size={14} /> {historyError}
            </div>
          )}

          <div className="db-service-list">
          {history?.events.slice(0, 6).map(evt => (
              <button
                key={evt.id}
                className="db-service-item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: evt.id === selectedEvent?.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.6rem',
                  marginBottom: '0.45rem',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedEventId(evt.id)}
              >
                <span className="db-service-dot"><Hash size={14} /></span>
                <span className="db-service-label">
                  <strong>{evt.event_type}</strong>
                  <span style={{ opacity: 0.7, marginLeft: '0.4rem' }}>#{evt.id}</span>
                </span>
                <span className={`db-service-badge ${evt.status === 'success' ? 'ok' : 'missing'}`}>
                  {evt.status}
                </span>
              </button>
            ))}
            {history && history.events.length > 6 && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
                … and {history.events.length - 6} more. See History tab for all.
              </p>
            )}
            {!history?.events?.length && !loading && (
              <p className="db-empty">No saved generations yet.</p>
            )}
          </div>
        </div>

        <div className="glass-card db-panel reveal">
          <h3 className="db-panel-title">
            <Activity size={16} /> Event Details
          </h3>

          {!selectedEvent && (
            <p className="db-empty">Select an event to view details.</p>
          )}

          {selectedEvent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="meta-chip">
                <strong>{selectedEvent.event_type}</strong> &nbsp;#{selectedEvent.id}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.35rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Created</span>
                <span>{new Date(selectedEvent.created_at).toLocaleString()}</span>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span>{selectedEvent.status}</span>
                <span style={{ color: 'var(--text-muted)' }}>Job ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedEvent.job_id || '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
