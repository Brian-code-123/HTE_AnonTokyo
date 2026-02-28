/**
 * Application Header Component
 *
 * Displays the VoiceTrace branding, nav tabs, and theme toggle.
 */
import { Mic, Sun, Moon, LayoutDashboard, Volume2, Clapperboard, MessageSquare } from 'lucide-react'
import type { Theme, AppTab } from '../types'

const NAV_TABS: { key: AppTab; label: string; icon: typeof Mic }[] = [
  { key: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { key: 'transcribe',   label: 'Transcribe',   icon: Mic },
  { key: 'voice-report', label: 'Voice Report', icon: Volume2 },
  { key: 'video-gen',    label: 'Video Gen',    icon: Clapperboard },
  { key: 'feedback',     label: 'Feedback',     icon: MessageSquare },
]

interface HeaderProps {
  theme: Theme
  onToggle: () => void
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export default function Header({ theme, onToggle, activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="header">
      {/* Brand */}
      <div className="header-brand">
        <div className="header-logo">
          <Mic />
        </div>
        <div>
          <div className="header-title">VoiceTrace</div>
          <div className="header-subtitle">AI Transcription</div>
        </div>
      </div>

      {/* Inline nav tabs */}
      <nav className="header-nav">
        {NAV_TABS.map(tab => (
          <button
            key={tab.key}
            className={`header-nav-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
        {theme === 'light' ? <Moon /> : <Sun />}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </header>
  )
}
