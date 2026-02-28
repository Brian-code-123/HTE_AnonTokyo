/**
 * AssistantWidget — Floating AI Guide in the bottom-right corner.
 *
 * Provides contextual help and tips about each section of VoiceTrace.
 * Fully self-contained; does NOT call any backend API.
 */
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, ChevronDown } from 'lucide-react'

interface Message {
  from: 'bot' | 'user'
  text: string
}

const SUGGESTIONS = [
  'How do I transcribe a video?',
  'What is Full Analysis mode?',
  'How does Voice Report work?',
  'What is Video Generator for?',
  'How do I give feedback to the AI?',
  'What file formats are supported?',
]

const FAQ: Record<string, string> = {
  'how do i transcribe a video':
    '📤 Go to the **Transcribe** tab. You can either drag-and-drop a video file (MP4, MOV, AVI, MKV, WebM) or paste a YouTube URL. Choose your language, then click "Start Transcribing".',
  'what is full analysis mode':
    '🎓 **Full Analysis** runs a complete AI evaluation: it transcribes your lesson, analyses body language, scores the rubric, and maps out knowledge points — all in one step. Toggle it in the Transcribe tab.',
  'how does voice report work':
    '🔊 In the **Voice Report** tab, paste any text (or it auto-fills with your last transcript). Choose a voice and emotion, then click "Generate Speech". MiniMax TTS converts it to natural audio you can play or download.',
  'what is video generator for':
    '🎬 The **Video Generator** tab lets you describe a concept in text, and MiniMax Hailuo AI will produce a short explanatory video — great for reinforcing complex topics visually.',
  'how do i give feedback to the ai':
    '💬 Head to the **Feedback** tab. Paste your transcript, body language notes, or rubric. Add any extra context (subject, grade), then click "Generate Feedback". The AI returns personalised coaching tips.',
  'what file formats are supported':
    '📁 Supported video formats: **MP4, MOV, AVI, MKV, WebM**. Audio is extracted automatically. There is no strict file-size limit, but large files may take longer to process.',
}

function getBotReply(input: string): string {
  const lower = input.toLowerCase().trim()
  for (const [key, answer] of Object.entries(FAQ)) {
    if (lower.includes(key.split(' ')[0]) && lower.includes(key.split(' ').slice(-1)[0])) {
      return answer
    }
  }
  // Keyword matching fallback
  if (lower.includes('transcri'))
    return FAQ['how do i transcribe a video']
  if (lower.includes('full') || lower.includes('analysis'))
    return FAQ['what is full analysis mode']
  if (lower.includes('voice') || lower.includes('tts') || lower.includes('speech'))
    return FAQ['how does voice report work']
  if (lower.includes('video') || lower.includes('hailuo') || lower.includes('generat'))
    return FAQ['what is video generator for']
  if (lower.includes('feedback'))
    return FAQ['how do i give feedback to the ai']
  if (lower.includes('format') || lower.includes('file') || lower.includes('mp4'))
    return FAQ['what file formats are supported']
  return "🤔 I'm not sure about that. Try asking things like:\n• How do I transcribe a video?\n• What is Full Analysis?\n• How does Voice Report work?"
}

export default function AssistantWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: '👋 Hi! I\'m your VoiceTrace guide. Ask me anything about the app, or pick a question below!' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const send = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { from: 'user', text: text.trim() }
    const botMsg: Message  = { from: 'bot',  text: getBotReply(text) }
    setMessages(prev => [...prev, userMsg, botMsg])
    setInput('')
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send(input)
  }

  return (
    <div className="assistant-root">
      {/* Chat Panel */}
      {open && (
        <div className="assistant-panel">
          <div className="assistant-header">
            <span className="assistant-header-title">
              <Bot size={16} />
              VoiceTrace Guide
            </span>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Close">
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="assistant-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`assistant-msg ${msg.from}`}>
                {msg.from === 'bot' && (
                  <div className="assistant-avatar">
                    <Bot size={13} />
                  </div>
                )}
                <div className="assistant-bubble">{msg.text}</div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="assistant-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="assistant-suggestion" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="assistant-input-row">
            <input
              className="assistant-input"
              type="text"
              placeholder="Ask a question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="assistant-send"
              onClick={() => send(input)}
              disabled={!input.trim()}
              aria-label="Send"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        className={`assistant-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle assistant"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
        {!open && <span className="assistant-fab-label">Help</span>}
      </button>
    </div>
  )
}
