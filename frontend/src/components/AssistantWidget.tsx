/**
 * AssistantWidget — Floating AI Guide powered by ASI One.
 *
 * Live chat backed by the /api/chat endpoint (ASI One asi1-mini model).
 * Falls back to a static FAQ if the backend is unreachable.
 */
import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, ChevronDown, Loader2, Sparkles } from 'lucide-react'
import { sendChatMessage } from '../services/api'
import type { ChatMessage } from '../services/api'

interface Message {
  from: 'bot' | 'user'
  text: string
  loading?: boolean
}

const QUICK_SUGGESTIONS = [
  'How do I transcribe a video?',
  'What is AI Coaching?',
  'How does Full Analysis work?',
  'What is the Rubric Builder?',
  'How do I compare analyses?',
  'What file formats are supported?',
]

const WELCOME_TEXT =
  "👋 Hi! I'm your VoiceTrace AI guide — powered by **ASI One**.\n\nAsk me anything about the platform, teaching strategies, or how to get the most from your analyses!"

export default function AssistantWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: WELCOME_TEXT },
  ])
  const [input, setInput]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  // Build API history from current messages (exclude the welcome message)
  const buildHistory = (msgs: Message[]): ChatMessage[] =>
    msgs
      .filter((_, i) => i > 0)
      .filter(m => !m.loading)
      .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }))

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const userMsg: Message = { from: 'user', text: trimmed }
    const placeholder: Message = { from: 'bot', text: '', loading: true }

    setMessages(prev => {
      const updated = [...prev, userMsg, placeholder]
      // Scroll after state updates
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      return updated
    })
    setInput('')
    setSending(true)

    try {
      // Build history from messages before the new user message (excluding loading placeholders)
      const historyMsgs = buildHistory(messages)

      const { reply } = await sendChatMessage(trimmed, historyMsgs)

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { from: 'bot', text: reply }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          from: 'bot',
          text: "⚠️ I couldn't reach the AI right now. Make sure the backend is running, then try again.",
        }
        return updated
      })
    } finally {
      setSending(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) send(input)
  }

  return (
    <div className="assistant-root">
      {open && (
        <div className="assistant-panel">
          {/* Header */}
          <div className="assistant-header">
            <span className="assistant-header-title">
              <Bot size={16} />
              VoiceTrace Guide
              <span className="assistant-badge-asi">
                <Sparkles size={10} />
                ASI One
              </span>
            </span>
            <button className="assistant-close" onClick={() => setOpen(false)} aria-label="Close">
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="assistant-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`assistant-msg ${msg.from}`}>
                {msg.from === 'bot' && (
                  <div className="assistant-avatar">
                    <Bot size={13} />
                  </div>
                )}
                {msg.loading ? (
                  <div className="assistant-bubble assistant-bubble-loading">
                    <Loader2 size={14} className="spin" />
                    <span>Thinking…</span>
                  </div>
                ) : (
                  <div className="assistant-bubble">{msg.text}</div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions — only show near start of conversation */}
          {messages.length <= 3 && (
            <div className="assistant-suggestions">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="assistant-suggestion"
                  onClick={() => send(s)}
                  disabled={sending}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="assistant-input-row">
            <input
              className="assistant-input"
              type="text"
              placeholder="Ask anything about VoiceTrace…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={sending}
            />
            <button
              className="assistant-send"
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              aria-label="Send"
            >
              {sending ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
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
