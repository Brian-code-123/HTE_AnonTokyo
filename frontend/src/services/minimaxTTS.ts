/**
 * MiniMax Text-to-Audio (T2A) v2 Service
 *
 * Calls the MiniMax T2A v2 API directly from the browser.
 * Audio is returned as a URL (output_format: "url") so it can be
 * played immediately in an <audio> element — no hex decoding needed.
 *
 * API docs: https://www.minimax.io/platform/docs/t2a_v2
 *
 * CORS note: In dev the Vite proxy (/minimax-api → https://api.minimax.io)
 * is used.  In production the same path must be proxied by the hosting layer
 * (Nginx / CloudFront / etc.).
 */

const API_KEY = import.meta.env.VITE_MINIMAX_API_KEY as string | undefined
const BASE_URL = '/minimax-api/v1'

/** Free a previously created Blob URL (called when the component unmounts). */
export function revokeAudioUrl(url: string) {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface TTSRequestOptions {
  text: string
  voice_id?: string
  speed?: number        // 0.5 – 2.0
  emotion?: string      // neutral | happy | sad | angry | surprised ...
  language_boost?: string
}

export interface TTSAudioResult {
  /** Local Blob URL — playable in <audio src={...}> */
  audio_url: string
  duration_ms: number
  sample_rate: number
  word_count: number
  format: string
}

export interface TTSVoice {
  id: string
  name: string
  lang: string
}

// ── Voice catalogue (kept in sync with the backend defaults) ─────────────

export const MINIMAX_VOICES: TTSVoice[] = [
  { id: 'presenter_male',       name: 'Presenter (Male)',    lang: 'en' },
  { id: 'presenter_female',     name: 'Presenter (Female)',  lang: 'en' },
  { id: 'audiobook_male_1',     name: 'Audiobook (Male)',    lang: 'en' },
  { id: 'audiobook_female_1',   name: 'Audiobook (Female)',  lang: 'en' },
  { id: 'male-qn-qingse',       name: 'Qingse (Male)',       lang: 'zh' },
  { id: 'male-qn-jingying',     name: 'Jingying (Male)',     lang: 'zh' },
  { id: 'male-qn-badao',        name: 'Badao (Male)',        lang: 'zh' },
  { id: 'male-qn-daxuesheng',   name: 'Student (Male)',      lang: 'zh' },
  { id: 'female-shaonv',        name: 'Shaonv (Female)',     lang: 'zh' },
  { id: 'female-yujie',         name: 'Yujie (Female)',      lang: 'zh' },
  { id: 'female-chengshu',      name: 'Chengshu (Female)',   lang: 'zh' },
  { id: 'female-tianmei',       name: 'Tianmei (Female)',    lang: 'zh' },
]

// ── Core API call ─────────────────────────────────────────────────────────

/**
 * Generate speech audio from text using the MiniMax T2A v2 API.
 *
 * Process:
 *   1. POST /minimax-api/v1/t2a_v2 with output_format:"url"
 *   2. Read the audio URL from data.audio
 *   3. Return the URL directly — no hex decoding needed
 */
export async function generateTTSDirect(opts: TTSRequestOptions): Promise<TTSAudioResult> {
  if (!API_KEY) {
    throw new Error('VITE_MINIMAX_API_KEY is not set.  Add it to frontend/.env')
  }

  const payload = {
    model: 'speech-02-hd',
    text: opts.text.slice(0, 10_000),
    stream: false,
    output_format: 'url',
    voice_setting: {
      voice_id:  opts.voice_id  ?? 'presenter_male',
      speed:     opts.speed     ?? 1.0,
      vol:       1.0,
      pitch:     0,
      emotion:   opts.emotion   ?? 'neutral',
    },
    audio_setting: {
      sample_rate: 32_000,
      bitrate:     128_000,
      format:      'mp3',
      channel:     1,
    },
    language_boost: opts.language_boost ?? 'auto',
  }

  let resp: Response
  try {
    resp = await fetch(`${BASE_URL}/t2a_v2`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch (networkErr) {
    throw new Error(`Network error calling MiniMax TTS: ${networkErr}`)
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => String(resp.status))
    throw new Error(`MiniMax TTS HTTP ${resp.status}: ${body}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any
  try {
    data = await resp.json()
  } catch {
    throw new Error('MiniMax TTS returned non-JSON response')
  }

  // Check API-level status code
  const baseResp = data?.base_resp ?? {}
  if (baseResp.status_code !== 0) {
    throw new Error(`MiniMax TTS error (${baseResp.status_code}): ${baseResp.status_msg ?? 'Unknown error'}`)
  }

  // Audio URL is in data.audio when output_format is "url"
  const audioData = data?.data ?? {}
  const audioUrl: string = audioData?.audio ?? ''
  if (!audioUrl) {
    // Debug: log actual response shape so we can diagnose further
    console.error('MiniMax TTS response (unexpected shape):', JSON.stringify(data).slice(0, 500))
    throw new Error('MiniMax TTS returned empty audio data')
  }

  const extra = data?.extra_info ?? {}
  return {
    audio_url:   audioUrl,
    duration_ms: extra.audio_length      ?? 0,
    sample_rate: extra.audio_sample_rate ?? 32_000,
    word_count:  extra.word_count        ?? 0,
    format:      'mp3',
  }
}
