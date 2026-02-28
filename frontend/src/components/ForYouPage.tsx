/**
 * ForYou Page — Categorized Tools Hub
 *
 * Presents all tools in horizontal, categorized card groups.
 * Clicking a card opens the corresponding sub-tool inline.
 */
import { useState, useEffect } from 'react'
import {
  Mic, Volume2, Clapperboard, BookOpen, TrendingUp,
  GitCompareArrows, Brain, ArrowLeft, Sparkles,
} from 'lucide-react'
import type { ForYouTool } from '../types'
import UploadSection from './UploadSection'
import ProgressBar from './ProgressBar'
import ResultView from './ResultView'
import AnalysisResultView from './AnalysisResultView'
import VoiceReport from './VoiceReport'
import VideoGenerator from './VideoGenerator'
import RubricBuilder from './RubricBuilder'
import TeacherTimelineView from './TeacherTimeline'
import ComparisonView from './ComparisonView'
import AICoaching from './AICoaching'
import { transcribeFile, transcribeYoutube, fullAnalysisFile, fullAnalysisYoutube, seedDemoData } from '../services/api'
import type { AnalysisMode, InputMode, ProgressState, TranscriptResult, FullAnalysisResult } from '../types'
import { useScrollRevealGroup } from '../hooks/useAnimations'

interface ForYouPageProps {
  initialTool?: ForYouTool | null
  onToolChange?: (tool: ForYouTool | null) => void
}

interface ToolCard {
  id: ForYouTool
  label: string
  description: string
  icon: typeof Mic
  color: string
}

interface ToolCategory {
  title: string
  description: string
  tools: ToolCard[]
}

const TOOL_CATEGORIES: ToolCategory[] = [
  {
    title: '🎯 Analysis Tools',
    description: 'Transcribe and evaluate teaching sessions',
    tools: [
      {
        id: 'transcribe',
        label: 'Transcribe & Analyse',
        description: 'Upload video/audio or paste a YouTube link for AI transcription and full analysis',
        icon: Mic,
        color: '#6366f1',
      },
      {
        id: 'compare',
        label: 'Compare Analyses',
        description: 'Side-by-side comparison of multiple lessons with radar charts',
        icon: GitCompareArrows,
        color: '#f59e0b',
      },
    ],
  },
  {
    title: '🤖 AI-Powered Tools',
    description: 'Leverage AI for insights and content creation',
    tools: [
      {
        id: 'coaching',
        label: 'AI Coaching',
        description: 'Get personalised improvement plans based on your teaching trends',
        icon: Brain,
        color: '#ec4899',
      },
      {
        id: 'voice-report',
        label: 'Voice Report',
        description: 'Convert transcripts into natural speech with emotion & voice control',
        icon: Volume2,
        color: '#22c55e',
      },
      {
        id: 'video-gen',
        label: 'Video Generator',
        description: 'Create short AI-generated concept explanation videos',
        icon: Clapperboard,
        color: '#8b5cf6',
      },
    ],
  },
  {
    title: '📊 Data & Tracking',
    description: 'Manage rubrics and track progress over time',
    tools: [
      {
        id: 'rubrics',
        label: 'Rubric Builder',
        description: 'Create custom evaluation rubrics with weighted dimensions',
        icon: BookOpen,
        color: '#0ea5e9',
      },
      {
        id: 'timeline',
        label: 'Teacher Timeline',
        description: 'Track performance trends across lessons with aggregated metrics',
        icon: TrendingUp,
        color: '#14b8a6',
      },
    ],
  },
]

const IDLE_PROGRESS: ProgressState = { status: 'idle', percent: 0, message: '' }

export default function ForYouPage({ initialTool = null, onToolChange }: ForYouPageProps) {
  const [activeTool, setActiveTool] = useState<ForYouTool | null>(initialTool)
  const [seeded, setSeeded] = useState(false)

  // Sync initialTool prop changes (from header dropdown)
  useEffect(() => {
    if (initialTool !== activeTool) {
      setActiveTool(initialTool ?? null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTool])

  // Auto-seed demo data once so data pages are populated immediately
  useEffect(() => {
    if (!seeded) {
      setSeeded(true)
      seedDemoData().catch(() => { /* silent — data may already exist */ })
    }
  }, [seeded])

  const selectTool = (tool: ForYouTool | null) => {
    setActiveTool(tool)
    onToolChange?.(tool)
  }

  // ── Transcription state (reused when transcribe tool is open) ──────
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('transcribe')
  const [usePlaceholder, setUsePlaceholder] = useState(true)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [language, setLanguage] = useState('auto')
  const [progress, setProgress] = useState<ProgressState>(IDLE_PROGRESS)
  const [transcriptResult, setTranscriptResult] = useState<TranscriptResult | null>(null)
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null)

  const isProcessing =
    progress.status !== 'idle' &&
    progress.status !== 'done' &&
    progress.status !== 'error'

  const handleSubmit = async () => {
    setTranscriptResult(null)
    setAnalysisResult(null)
    try {
      if (analysisMode === 'full-analysis') {
        if (inputMode === 'upload' && file) {
          setProgress({ status: 'uploading', percent: 5, message: 'Uploading file…' })
          const data = await fullAnalysisFile({
            file, language, usePlaceholder,
            onProgress: pct => setProgress({ status: 'analyzing', percent: Math.round(pct * 0.4), message: 'Uploading…' }),
          })
          setProgress({ status: 'done', percent: 100, message: 'Analysis complete!' })
          setAnalysisResult(data)
        } else if (inputMode === 'youtube' && youtubeUrl.trim()) {
          setProgress({ status: 'analyzing', percent: 20, message: 'Fetching & analysing video…' })
          const data = await fullAnalysisYoutube({ url: youtubeUrl.trim(), language, usePlaceholder })
          setProgress({ status: 'done', percent: 100, message: 'Analysis complete!' })
          setAnalysisResult(data)
        }
      } else {
        if (inputMode === 'upload' && file) {
          setProgress({ status: 'uploading', percent: 5, message: 'Uploading file…' })
          const data = await transcribeFile({
            file, language,
            onProgress: pct => {
              if (pct < 100) {
                setProgress({ status: 'uploading', percent: Math.round(pct * 0.35), message: 'Uploading file…' })
              } else {
                setProgress({ status: 'extracting', percent: 40, message: 'Extracting audio track…' })
                setTimeout(() => setProgress({ status: 'transcribing', percent: 65, message: 'Transcribing with AI…' }), 800)
              }
            },
          })
          setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
          setTranscriptResult(data)
        } else if (inputMode === 'youtube' && youtubeUrl.trim()) {
          setProgress({ status: 'uploading', percent: 10, message: 'Fetching YouTube video…' })
          setTimeout(() => setProgress({ status: 'extracting', percent: 35, message: 'Extracting audio…' }), 1200)
          setTimeout(() => setProgress({ status: 'transcribing', percent: 60, message: 'Transcribing with AI…' }), 3000)
          const data = await transcribeYoutube({ url: youtubeUrl.trim(), language })
          setProgress({ status: 'done', percent: 100, message: 'Transcription complete!' })
          setTranscriptResult(data)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setProgress({ status: 'error', percent: 0, message })
    }
  }

  const handleReset = () => {
    setProgress(IDLE_PROGRESS)
    setTranscriptResult(null)
    setAnalysisResult(null)
    setFile(null)
    setYoutubeUrl('')
  }

  const goBack = () => {
    selectTool(null)
    handleReset()
  }

  // ── If a tool is active, show its content ──
  if (activeTool) {
    return (
      <div className="for-you-tool-view">
        <button className="for-you-back-btn" onClick={goBack}>
          <ArrowLeft size={16} />
          Back to Tools
        </button>

        {activeTool === 'transcribe' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">✦ Powered by AI</div>
              <h1>Transcribe &amp; Analyse</h1>
              <p className="hero-desc">
                Upload a video file or paste a YouTube link — we'll extract the audio
                and transcribe it in seconds. Toggle Full Analysis for complete evaluation.
              </p>
            </section>
            {!transcriptResult && !analysisResult && (
              <div className="glass-card">
                <UploadSection
                  analysisMode={analysisMode}
                  onAnalysisModeChange={setAnalysisMode}
                  usePlaceholder={usePlaceholder}
                  onUsePlaceholderChange={setUsePlaceholder}
                  inputMode={inputMode}
                  onModeChange={setInputMode}
                  file={file}
                  onFileChange={setFile}
                  youtubeUrl={youtubeUrl}
                  onYoutubeUrlChange={setYoutubeUrl}
                  language={language}
                  onLanguageChange={setLanguage}
                  onSubmit={handleSubmit}
                  isDisabled={isProcessing}
                />
              </div>
            )}
            {progress.status !== 'idle' && !transcriptResult && !analysisResult && (
              <ProgressBar progress={progress} />
            )}
            {analysisResult && (
              <AnalysisResultView result={analysisResult} onReset={handleReset} />
            )}
            {transcriptResult && (
              <ResultView result={transcriptResult} onReset={handleReset} />
            )}
          </>
        )}

        {activeTool === 'voice-report' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🔊 MiniMax Speech AI</div>
              <h1>Voice Feedback Report</h1>
              <p className="hero-desc">
                Convert your transcript or any text into natural, expressive speech.
              </p>
            </section>
            <div className="glass-card">
              <VoiceReport transcriptText={transcriptResult?.full_text || ''} />
            </div>
          </>
        )}

        {activeTool === 'video-gen' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🎬 MiniMax Hailuo AI</div>
              <h1>Concept Video Generator</h1>
              <p className="hero-desc">
                Describe a concept and our AI will generate a short explanation video.
              </p>
            </section>
            <div className="glass-card">
              <VideoGenerator />
            </div>
          </>
        )}

        {activeTool === 'rubrics' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">📋 Custom Evaluation</div>
              <h1>Rubric Builder</h1>
              <p className="hero-desc">
                Create custom evaluation rubrics with weighted dimensions.
              </p>
            </section>
            <div className="glass-card">
              <RubricBuilder />
            </div>
          </>
        )}

        {activeTool === 'timeline' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">📈 Longitudinal Tracking</div>
              <h1>Teacher Timeline</h1>
              <p className="hero-desc">
                Track teaching performance over time with trend analysis.
              </p>
            </section>
            <TeacherTimelineView />
          </>
        )}

        {activeTool === 'compare' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🔍 Side-by-Side Analysis</div>
              <h1>Compare Analyses</h1>
              <p className="hero-desc">
                Select multiple analyses and compare them side by side.
              </p>
            </section>
            <ComparisonView />
          </>
        )}

        {activeTool === 'coaching' && (
          <>
            <section className="hero compact">
              <div className="hero-eyebrow">🧠 AI-Powered Insights</div>
              <h1>AI Coaching Plan</h1>
              <p className="hero-desc">
                Get personalised improvement suggestions based on your teaching trend data.
              </p>
            </section>
            <AICoaching />
          </>
        )}
      </div>
    )
  }

  // ── Main tools grid ──
  const cardsRef = useScrollRevealGroup<HTMLDivElement>()

  return (
    <div className="for-you-page" ref={cardsRef}>
      <section className="hero compact reveal">
        <div className="hero-eyebrow"><Sparkles size={14} /> Personalised Toolkit</div>
        <h1>For You</h1>
        <p className="hero-desc">
          Explore AI-powered tools organised by category.
          Click any card to get started.
        </p>
      </section>

      {TOOL_CATEGORIES.map(category => (
        <div key={category.title} className="for-you-category reveal">
          <div className="for-you-category-header">
            <h2 className="for-you-category-title">{category.title}</h2>
            <p className="for-you-category-desc">{category.description}</p>
          </div>

          <div className="for-you-cards-row">
            {category.tools.map(tool => (
              <button
                key={tool.id}
                className="for-you-card"
                onClick={() => selectTool(tool.id)}
              >
                <div
                  className="for-you-card-icon"
                  style={{ background: `${tool.color}18`, color: tool.color }}
                >
                  <tool.icon size={24} />
                </div>
                <div className="for-you-card-text">
                  <h3>{tool.label}</h3>
                  <p>{tool.description}</p>
                </div>
                <div className="for-you-card-arrow">→</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
