import {
  Mic, Github, ArrowUp, Lock,
  LayoutDashboard, Sparkles, MessageSquare,
} from 'lucide-react'
import type { AppTab } from '../types'

interface FooterProps {
  onNavigate?: (tab: AppTab) => void
}

export default function Footer({ onNavigate }: FooterProps) {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const nav = (tab: AppTab) => (e: React.MouseEvent) => {
    e.preventDefault()
    onNavigate?.(tab)
    scrollToTop()
  }

  return (
    <footer className="site-footer">
      <div className="footer-main">
        {/* ── Brand ────────────────────────────────────────────── */}
        <div className="footer-col footer-brand-col">
          <div className="footer-logo">
            <Mic size={22} />
            <span className="footer-logo-text">VoiceTrace</span>
          </div>
          <p className="footer-tagline">
            AI-powered speech transcription, body language analysis &amp; teaching evaluation.
          </p>
          <div className="footer-badge">
            <Lock size={12} />
            <span>Processing locally when possible</span>
          </div>
          <div className="footer-socials">
            <a
              href="https://github.com/Crugo1202/HTE_AnonTokyo"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
          </div>
        </div>

        {/* ── Navigate ─────────────────────────────────────────── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Navigate</h4>
          <ul className="footer-links">
            <li><a href="#" onClick={nav('dashboard')}><LayoutDashboard size={14} /> Dashboard</a></li>
            <li><a href="#" onClick={nav('for-you')}><Sparkles size={14} /> For You</a></li>
            <li><a href="#" onClick={nav('feedback')}><MessageSquare size={14} /> Feedback</a></li>
          </ul>
        </div>

        {/* ── Powered by ───────────────────────────────────────── */}
        <div className="footer-col">
          <h4 className="footer-col-title">Powered by</h4>
          <ul className="footer-links">
            <li><a href="https://openai.com/research/whisper" target="_blank" rel="noopener noreferrer">Whisper — Transcription</a></li>
            <li><a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">ElevenLabs — Transcription</a></li>
            <li><a href="https://deepmind.google/technologies/gemini" target="_blank" rel="noopener noreferrer">Gemini — Evaluation &amp; Analysis</a></li>
            <li><a href="https://www.minimax.io" target="_blank" rel="noopener noreferrer">MiniMax — TTS &amp; Video Gen</a></li>
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────── */}
      <div className="footer-bottom">
        <span className="footer-copy">
          &copy; {new Date().getFullYear()} VoiceTrace — HTE AnonTokyo
        </span>
        <button className="footer-back-top" onClick={scrollToTop}>
          Back to Top <ArrowUp size={14} />
        </button>
      </div>
    </footer>
  )
}
