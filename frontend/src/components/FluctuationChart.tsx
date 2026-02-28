import type { FluctuationWindow } from '../types'

interface Props {
  timeline: FluctuationWindow[]
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function scoreColor(score: number): string {
  if (score >= 65) return 'var(--success)'
  if (score >= 35) return 'var(--warning)'
  return 'var(--error)'
}

function scoreLabel(score: number): string {
  if (score >= 65) return 'Dynamic'
  if (score >= 35) return 'Moderate'
  return 'Monotone'
}

export default function FluctuationChart({ timeline }: Props) {
  if (timeline.length === 0) return null

  const avg = Math.round(
    timeline.reduce((sum, w) => sum + w.fluctuation_score, 0) / timeline.length,
  )
  const max = Math.max(...timeline.map(w => w.fluctuation_score))

  return (
    <div style={{
      padding: '1.25rem 1.5rem',
      background: 'var(--bg-glass)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      marginBottom: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          Voice Fluctuation
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: scoreColor(avg),
            color: '#fff',
          }}>
            Avg: {avg} — {scoreLabel(avg)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
        {timeline.map((w, i) => {
          const height = max > 0 ? (w.fluctuation_score / 100) * 100 : 0
          return (
            <div
              key={i}
              title={`${formatTime(w.timestamp_start)} – ${formatTime(w.timestamp_end)}: ${Math.round(w.fluctuation_score)}`}
              style={{
                flex: 1,
                height: `${Math.max(height, 3)}%`,
                background: scoreColor(w.fluctuation_score),
                borderRadius: '3px 3px 0 0',
                opacity: 0.85,
                transition: 'opacity 0.15s',
                cursor: 'default',
                minWidth: '6px',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
            />
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '0.35rem',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
      }}>
        <span>{formatTime(timeline[0].timestamp_start)}</span>
        <span>{formatTime(timeline[timeline.length - 1].timestamp_end)}</span>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        marginTop: '0.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--error)', marginRight: 4 }} />Monotone (&lt;35)</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--warning)', marginRight: 4 }} />Moderate (35-65)</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--success)', marginRight: 4 }} />Dynamic (&gt;65)</span>
      </div>
    </div>
  )
}
