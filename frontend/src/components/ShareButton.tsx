/**
 * Share Button Component
 *
 * Creates a share link for an analysis and copies to clipboard.
 */
import { useState } from 'react'
import { Share2, Check, Link, Copy } from 'lucide-react'
import { createShareLink } from '../services/api'
import type { ShareLink } from '../types'

interface ShareButtonProps {
  analysisId: string
  compact?: boolean
}

export default function ShareButton({ analysisId, compact }: ShareButtonProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async () => {
    if (shareLink) {
      // Already have a link, just copy it
      await copyToClipboard(shareLink.share_url)
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await createShareLink(analysisId)
      setShareLink(result)
      await copyToClipboard(result.share_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (compact) {
    return (
      <button
        className={`btn-icon ${copied ? 'btn-success' : ''}`}
        onClick={handleShare}
        disabled={loading}
        title={copied ? 'Copied!' : 'Share link'}
      >
        {loading ? <span className="spinner-sm" /> : copied ? <Check size={16} /> : <Share2 size={16} />}
      </button>
    )
  }

  return (
    <div className="share-widget">
      <button
        className={`btn-primary share-btn ${copied ? 'copied' : ''}`}
        onClick={handleShare}
        disabled={loading}
      >
        {loading ? (
          <>Generating…</>
        ) : copied ? (
          <><Check size={16} /> Copied!</>
        ) : (
          <><Share2 size={16} /> Share Analysis</>
        )}
      </button>

      {shareLink && (
        <div className="share-link-display">
          <Link size={14} />
          <span className="share-url">{shareLink.share_url}</span>
          <button className="btn-icon" onClick={() => copyToClipboard(shareLink.share_url)}>
            <Copy size={14} />
          </button>
          <span className="share-expires">Expires: {new Date(shareLink.expires_at).toLocaleDateString()}</span>
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}
    </div>
  )
}
