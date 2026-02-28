/**
 * Voice Report Component — powered by ElevenLabs TTS
 *
 * Features:
 *   • Direct ElevenLabs API call (frontend-only, no backend needed)
 *   • Full audio player: play/pause, seekable progress bar, time display
 *   • Voice selection (12 curated voices, split by gender)
 *   • Model selection (Multilingual v2, Turbo, Monolingual)
 *   • Speed (0.7 – 1.2×), Stability & Style sliders
 *   • Download generated MP3
 *   • Blob URL cleanup on unmount
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Volume2, Play, Pause, Download, Loader2, RefreshCw,
  ChevronDown, AlertCircle, Music2,
} from 'lucide-react'
import {
  generateTTSDirect,
  ELEVENLABS_VOICES,
  ELEVENLABS_MODELS,
  revokeAudioUrl,
} from '../services/elevenlabsTTS'

interface VoiceReportProps {
  transcriptText?: string
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VoiceReport({ transcriptText = '' }: VoiceReportProps) {
  const [text, setText]           = useState(transcriptText)
  const [voiceId, setVoiceId]     = useState('21m00Tcm4TlvDq8ikWAM') // Rachel
  const [modelId, setModelId]     = useState('eleven_multilingual_v2')
  const [speed, setSpeed]         = useState(1.0)
  const [stability, setStability] = useState(0.5)
  const [style, setStyle]         = useState(0.0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [audioUrl, setAudioUrl]   = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(0)

  // ── Audio player state ──────────────────────────────────────────────
  const [isPlaying, setIsPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]       = useState(0)
  const [volume, setVolume]           = useState(1)
  const audioRef                       = useRef<HTMLAudioElement | null>(null)

  // Sync external transcript
  useEffect(() => { if (transcriptText) setText(transcriptText) }, [transcriptText])

  // Cleanup Blob URL on unmount
  useEffect(() => () => { if (audioUrl) revokeAudioUrl(audioUrl) }, [audioUrl])

  const setupAudio = useCallback((url: string) => {
    const audio = new Audio(url)
    audioRef.current = audio
    audio.volume = volume
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('timeupdate',     () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended',          () => { setIsPlaying(false); setCurrentTime(0) })
    audio.addEventListener('pause',          () => setIsPlaying(false))
    audio.addEventListener('play',           () => setIsPlaying(true))
  }, [volume])

  // ── Generate ────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)

    if (audioUrl) { revokeAudioUrl(audioUrl); setAudioUrl(null) }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }

    try {
      const result = await generateTTSDirect({ text, voice_id: voiceId, model_id: modelId, speed, stability, style })
      setAudioUrl(result.audio_url)
      setWordCount(result.word_count)
      setupAudio(result.audio_url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'TTS generation failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Playback ────────────────────────────────────────────────────────
  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    isPlaying ? a.pause() : a.play()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current; if (!a) return
    const val = parseFloat(e.target.value)
    a.currentTime = val; setCurrentTime(val)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
  }

  const handleDownload = () => {
    if (!audioUrl) return
    const a = document.createElement('a')
    a.href = audioUrl; a.download = 'voice_report.mp3'; a.click()
  }

  const charCount = text.length
  const charLimit = 5_000
  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0
  const femaleVoices = ELEVENLABS_VOICES.filter(v => v.gender === 'female')
  const maleVoices   = ELEVENLABS_VOICES.filter(v => v.gender === 'male')

  return (
    <div className="voice-report">
      {/* Header */}
      <div className="vr-header">
        <div className="vr-icon"><Volume2 size={24} /></div>
        <div>
          <h2 className="vr-title">Voice Report</h2>
          <p className="vr-subtitle">Natural speech synthesis · Powered by ElevenLabs</p>
        </div>
      </div>

      {/* Text Input */}
      <div className="vr-section">
        <label className="vr-label">Text to speak</label>
        <textarea
          className="vr-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your transcript, summary, or any text here…"
          rows={6}
          maxLength={charLimit}
          disabled={loading}
        />
        <div className="vr-char-count">
          <span className={charCount > charLimit * 0.9 ? 'vr-char-warn' : ''}>
            {charCount.toLocaleString()} / {charLimit.toLocaleString()} chars
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="vr-controls">
        {/* Voice */}
        <div className="vr-control-group">
          <label className="vr-label">Voice</label>
          <div className="vr-select-wrap">
            <select className="vr-select" value={voiceId} onChange={e => setVoiceId(e.target.value)} disabled={loading}>
              <optgroup label="Female">
                {femaleVoices.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                ))}
              </optgroup>
              <optgroup label="Male">
                {maleVoices.map(v => (
                  <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={16} className="vr-select-icon" />
          </div>
        </div>

        {/* Model */}
        <div className="vr-control-group">
          <label className="vr-label">Model</label>
          <div className="vr-select-wrap">
            <select className="vr-select" value={modelId} onChange={e => setModelId(e.target.value)} disabled={loading}>
              {ELEVENLABS_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="vr-select-icon" />
          </div>
        </div>

        {/* Speed */}
        <div className="vr-control-group">
          <label className="vr-label">Speed — {speed.toFixed(1)}×</label>
          <input type="range" className="vr-range" min={0.7} max={1.2} step={0.05}
            value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} disabled={loading} />
          <div className="vr-range-labels"><span>0.7×</span><span>1.0×</span><span>1.2×</span></div>
        </div>

        {/* Stability */}
        <div className="vr-control-group">
          <label className="vr-label">Stability — {Math.round(stability * 100)}%</label>
          <input type="range" className="vr-range" min={0} max={1} step={0.05}
            value={stability} onChange={e => setStability(parseFloat(e.target.value))} disabled={loading} />
          <div className="vr-range-labels"><span>Expressive</span><span></span><span>Consistent</span></div>
        </div>

        {/* Style exaggeration */}
        <div className="vr-control-group">
          <label className="vr-label">Style — {Math.round(style * 100)}%</label>
          <input type="range" className="vr-range" min={0} max={1} step={0.05}
            value={style} onChange={e => setStyle(parseFloat(e.target.value))} disabled={loading} />
          <div className="vr-range-labels"><span>Neutral</span><span></span><span>Exaggerated</span></div>
        </div>
      </div>

      {/* Generate button row */}
      <div className="vr-generate-row">
        <button className="vr-generate-btn" onClick={handleGenerate} disabled={loading || !text.trim()}>
          {loading
            ? <><Loader2 size={18} className="vr-spin" /> Generating speech…</>
            : audioUrl
              ? <><RefreshCw size={18} /> Regenerate</>
              : <><Volume2 size={18} /> Generate Voice Report</>}
        </button>
        {audioUrl && !loading && (
          <button className="vr-dl-btn-standalone" onClick={handleDownload}>
            <Download size={16} /> Download MP3
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="vr-error-banner">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="vr-loading-card glass-card">
          <Music2 size={28} className="vr-loading-icon" />
          <div>
            <p className="vr-loading-title">Synthesising speech…</p>
            <p className="vr-loading-sub">ElevenLabs · usually 3 – 10 s</p>
          </div>
        </div>
      )}

      {/* Audio Player */}
      {audioUrl && !loading && (
        <div className="vr-player glass-card">
          {/* Meta */}
          <div className="vr-player-meta-row">
            <span className="vr-player-badge"><Music2 size={14} /> Voice Report Ready</span>
            <span className="vr-player-stats">
              {wordCount > 0 && `${wordCount} words · `}
              {duration > 0 && `${duration.toFixed(1)} s · `}
              MP3
            </span>
          </div>

          {/* Seek bar */}
          <div className="vr-seek-area">
            <span className="vr-time">{formatTime(currentTime)}</span>
            <div className="vr-seek-track">
              <div className="vr-seek-fill" style={{ width: `${progress}%` }} />
              <input type="range" className="vr-seek-input"
                min={0} max={duration || 1} step={0.01}
                value={currentTime} onChange={handleSeek} />
            </div>
            <span className="vr-time">{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="vr-player-controls">
            <button className="vr-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="vr-volume-row">
              <Volume2 size={14} className="vr-vol-icon" />
              <input type="range" className="vr-range vr-volume-range"
                min={0} max={1} step={0.05} value={volume} onChange={handleVolumeChange} />
            </div>
            <button className="vr-dl-btn" onClick={handleDownload} title="Download MP3">
              <Download size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
