/**
 * Application Header Component
 *
 * Displays the MentorMirror branding, nav tabs, and theme toggle.
 * "For You" shows a NeoTrace-style dropdown mega-menu on hover.
 */
import { useState, useRef, useEffect } from 'react'
import {
  GraduationCap, Sun, Moon, LayoutDashboard, Sparkles, MessageSquare,
  Volume2, Clapperboard, BookOpen, TrendingUp, GitCompareArrows,
  Brain, ChevronDown, Mic,
} from 'lucide-react'
import type { Theme, AppTab, ForYouTool } from '../types'

interface ForYouColumn {
  heading: string
  icon: typeof GraduationCap
  items: { id: ForYouTool; label: string; icon: typeof GraduationCap }[]
}

const FOR_YOU_COLUMNS: ForYouColumn[] = [
  {
    heading: 'ANALYSIS',
    icon: Mic,
    items: [
      { id: 'transcribe',   label: 'Transcribe & Analyse', icon: Mic },
      { id: 'compare',      label: 'Compare Analyses',     icon: GitCompareArrows },
    ],
  },
  {
    heading: 'AI-POWERED',
    icon: Brain,
    items: [
      { id: 'coaching',     label: 'AI Coaching',         icon: Brain },
      { id: 'voice-report', label: 'Voice Report',        icon: Volume2 },
      { id: 'video-gen',    label: 'Video Generator',     icon: Clapperboard },
    ],
  },
  {
    heading: 'DATA & TRACKING',
    icon: BookOpen,
    items: [
      { id: 'rubrics',   label: 'Rubric Builder',   icon: BookOpen },
      { id: 'timeline',  label: 'Teacher Timeline', icon: TrendingUp },
    ],
  },
]

interface HeaderProps {
  theme: Theme
  onToggle: () => void
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
  onForYouToolSelect?: (tool: ForYouTool) => void
}

export default function Header({ theme, onToggle, activeTab, onTabChange, onForYouToolSelect }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 200)
  }

  const handleToolClick = (tool: ForYouTool) => {
    setDropdownOpen(false)
    onTabChange('for-you')
    onForYouToolSelect?.(tool)
  }

  return (
    <header className="header">
      {/* Brand */}
      <div className="header-brand">
        <div className="header-logo float-anim"><GraduationCap /></div>
        <div>
          <div className="header-title">MentorMirror</div>
          <div className="header-subtitle">AI Teaching Coach</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="header-nav">
        <button
          className={`header-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          <LayoutDashboard size={15} />
          Dashboard
        </button>

        {/* For You — mega-menu dropdown */}
        <div
          className="header-nav-dropdown-root"
          ref={dropdownRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button
            className={`header-nav-btn ${activeTab === 'for-you' ? 'active' : ''}`}
            onClick={() => { onTabChange('for-you'); setDropdownOpen(v => !v) }}
          >
            <Sparkles size={15} />
            For You
            <ChevronDown size={13} className={`nav-chevron ${dropdownOpen ? 'rotated' : ''}`} />
          </button>

          {dropdownOpen && (
            <div 
              className="nav-dropdown-panel"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {FOR_YOU_COLUMNS.map(col => (
                <div key={col.heading} className="nav-dropdown-col">
                  <div className="nav-dropdown-heading">
                    <col.icon size={13} />
                    {col.heading}
                  </div>
                  <div className="nav-dropdown-divider" />
                  {col.items.map(item => (
                    <button
                      key={item.id}
                      className="nav-dropdown-item"
                      onClick={() => handleToolClick(item.id)}
                    >
                      <item.icon size={14} />
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          className={`header-nav-btn ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => onTabChange('feedback')}
        >
          <MessageSquare size={15} />
          Feedback
        </button>
      </nav>

      {/* Theme toggle */}
      <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme">
        {theme === 'light' ? <Moon /> : <Sun />}
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
    </header>
  )
}

