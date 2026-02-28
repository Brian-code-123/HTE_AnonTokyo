/**
 * ElevenLabs Text-to-Speech Service
 *
 * Calls the backend proxy endpoint  POST /api/elevenlabs/tts
 * which forwards the request to ElevenLabs server-side.
 *
 * Why backend?
 *  - The ElevenLabs API key must have the "text_to_speech" permission enabled.
 *  - Routing through the backend avoids CORS and keeps the key out of the bundle.
 *
 * If you see a 401 / missing_permissions error, go to:
 *   elevenlabs.io → Profile → API Keys → Edit key → enable "Text to Speech"
 */

// ── Types ─────────────────────────────────────────────────────────────────

export interface ElevenLabsTTSOptions {
  text: string
  voice_id?: string
  model_id?: string
  stability?: number        // 0 – 1  (0 = expressive, 1 = consistent)
  similarity_boost?: number // 0 – 1
  style?: number            // 0 – 1  (style exaggeration)
  speed?: number            // 0.7 – 1.2
}

export interface TTSAudioResult {
  audio_url: string   // blob: URL — immediately playable
  word_count: number
  duration_ms: number
  format: string
}

export interface ElevenLabsVoice {
  id: string
  name: string
  description: string
  accent: string
  gender: 'male' | 'female'
}

// ── Curated voice catalogue ───────────────────────────────────────────────

export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  // Female
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',    description: 'Calm · Narration',    accent: 'American', gender: 'female' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',     description: 'Soft · Pleasant',     accent: 'American', gender: 'female' },
  { id: 'MF3mGyEYCl7XYWbV9V29', name: 'Elli',      description: 'Expressive · Young',  accent: 'American', gender: 'female' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy',   description: 'Pleasant · Children', accent: 'British',  gender: 'female' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Seductive · Warm',    accent: 'Swedish',  gender: 'female' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya',     description: 'Oversharing · RP',    accent: 'British',  gender: 'female' },
  // Male
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',      description: 'Deep · Relaxed',      accent: 'American', gender: 'male' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold',    description: 'Crisp · Ground',      accent: 'American', gender: 'male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',      description: 'Deep · Narrative',    accent: 'American', gender: 'male' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',    description: 'Polished · Reliable', accent: 'American', gender: 'male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam',      description: 'Articulate',          accent: 'American', gender: 'male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',    description: 'Authoritative · Deep',accent: 'British',  gender: 'male' },
]

export const ELEVENLABS_MODELS = [
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2 (Best)' },
  { id: 'eleven_turbo_v2_5',      label: 'Turbo v2.5 (Fast)'     },
  { id: 'eleven_monolingual_v1',  label: 'Monolingual v1 (EN)'   },
]

// ── Helpers ───────────────────────────────────────────────────────────────

export function revokeAudioUrl(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

// ── Core API call ─────────────────────────────────────────────────────────

export async function generateTTSDirect(opts: ElevenLabsTTSOptions): Promise<TTSAudioResult> {
  const body = {
    text:             opts.text.slice(0, 5_000),
    voice_id:         opts.voice_id         ?? '21m00Tcm4TlvDq8ikWAM',
    model_id:         opts.model_id         ?? 'eleven_multilingual_v2',
    stability:        opts.stability        ?? 0.50,
    similarity_boost: opts.similarity_boost ?? 0.75,
    style:            opts.style            ?? 0.0,
    speed:            opts.speed            ?? 1.0,
  }

  let resp: Response
  try {
    resp = await fetch('/api/elevenlabs/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (networkErr) {
    throw new Error(`Network error calling TTS backend: ${networkErr}`)
  }

  if (!resp.ok) {
    // Backend returns FastAPI's {"detail": "..."} on errors
    let errMsg = `TTS error ${resp.status}`
    try {
      const errJson = await resp.json()
      errMsg = typeof errJson.detail === 'string'
        ? errJson.detail
        : JSON.stringify(errJson.detail)
    } catch {
      errMsg = await resp.text().catch(() => errMsg)
    }
    throw new Error(errMsg)
  }

  // Response is raw MP3 bytes
  const blob     = await resp.blob()
  if (blob.size === 0) throw new Error('TTS returned empty audio — please try again')

  const audioUrl = URL.createObjectURL(blob)
  const wordCount = opts.text.trim().split(/\s+/).filter(Boolean).length

  return {
    audio_url:   audioUrl,
    word_count:  wordCount,
    duration_ms: 0,   // filled by the audio element's loadedmetadata event
    format:      'mp3',
  }
}
