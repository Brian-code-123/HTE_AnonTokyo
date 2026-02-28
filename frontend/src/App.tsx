/**
 * MentorMirror Main Application Component
 * 
 * Core application component that orchestrates:
 * - Dashboard overview
 * - "For You" categorized tools hub
 * - Feedback tab
 * - Floating AI Assistant
 */
import { useState } from 'react'
import { useTheme } from './hooks/useTheme'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ForYouPage from './components/ForYouPage'
import FeedbackTab from './components/FeedbackTab'
import AssistantWidget from './components/AssistantWidget'
import Footer from './components/Footer'
import type { AppTab, ForYouTool } from './types'

export default function App() {
  const { theme, toggle } = useTheme()

  const [activeTab, setActiveTab]         = useState<AppTab>('dashboard')
  const [forYouTool, setForYouTool]       = useState<ForYouTool | null>(null)

  const handleForYouToolSelect = (tool: ForYouTool) => {
    setForYouTool(tool)
    setActiveTab('for-you')
  }

  const handleTabChange = (tab: AppTab) => {
    setActiveTab(tab)
    // Reset sub-tool when navigating away from For You
    if (tab !== 'for-you') setForYouTool(null)
  }

  return (
    <div className="app-wrapper">
      <Header
        theme={theme}
        onToggle={toggle}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onForYouToolSelect={handleForYouToolSelect}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div key="dashboard" className="tab-panel">
            <Dashboard onNavigate={(tab) => handleTabChange(tab as AppTab)} />
          </div>
        )}

        {activeTab === 'for-you' && (
          <div key="for-you" className="tab-panel">
            <ForYouPage
              initialTool={forYouTool}
              onToolChange={setForYouTool}
            />
          </div>
        )}

        {activeTab === 'feedback' && (
          <div key="feedback" className="tab-panel">
            <FeedbackTab />
          </div>
        )}
      </main>

      <Footer onNavigate={handleTabChange} />
      <AssistantWidget />
    </div>
  )
}
