# API Documentation

Complete reference for VoiceTrace API endpoints.

## Base URL

```
http://localhost:8000          # Local development
https://voicetrace.example.com # Production
```

## Authentication

Currently, VoiceTrace does not require API authentication for local use. Production deployments should implement API key authentication.

## Content Types

All requests and responses use JSON, unless specified otherwise.

```
Content-Type: application/json
```

---

## Analysis Endpoints

### Upload & Analyze Video/Audio File

**POST** `/api/analyze`

Upload a classroom recording for transcription and analysis.

#### Request

```bash
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@classroom_video.mp4" \
  -F "language=auto"
```

**Parameters**:
- `file` (binary, required) — MP4, MOV, WebM, or MP3
- `language` (string, optional) — ISO 639 code (e.g., "en", "zh", "ja"). Default: "auto"

#### Response

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "transcript": {
    "full_text": "Today we're learning about photosynthesis...",
    "segments": [
      {
        "start": 0.0,
        "end": 5.5,
        "text": "Today we're learning about photosynthesis..."
      }
    ],
    "duration": 1234.56,
    "language": "en"
  }
}
```

**Status Codes**:
- `200` — Success
- `400` — Invalid file or request
- `413` — File too large (max: 500MB for direct upload, 2GB via S3)
- `500` — Server error

---

### Analyze YouTube Video

**POST** `/api/analyze/youtube`

Fetch and analyze a classroom recording from YouTube.

#### Request

```bash
curl -X POST http://localhost:8000/api/analyze/youtube \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=...",
    "language": "auto"
  }'
```

**Parameters**:
- `url` (string, required) — Full YouTube video URL
- `language` (string, optional) — Default: "auto"

#### Response

Same as `/api/analyze`

---

### Full Analysis (Transcription + Evaluation)

**POST** `/api/full-analysis`

Complete teaching analysis including transcription, body language, and evaluation.

#### Request

```bash
curl -X POST http://localhost:8000/api/full-analysis \
  -F "file=@classroom_video.mp4"
```

#### Response

```json
{
  "job_id": "uuid-string",
  "status": "completed",
  "transcript": { ... },
  "body_language": {
    "segments": [
      {
        "segment": 1,
        "timestamp": "0:00-3:00",
        "posture_quality": 4.2,
        "gesture_frequency": 2.5,
        "facial_engagement": 3.8,
        "overall_score": 3.8
      }
    ],
    "summary": "Good posture maintained throughout..."
  },
  "teaching_evaluation": {
    "clarity": 4.0,
    "depth": 3.5,
    "engagement": 4.2,
    "management": 3.8,
    "overall_score": 3.875,
    "rubric": "Excellent teaching performance with strong student engagement."
  },
  "feedback": {
    "strengths": ["Clear explanations", "Good pace", "Engaging delivery"],
    "improvements": ["Could use more visuals", "Pacing slowed in middle section"],
    "recommendations": [
      "Incorporate 2-3 visual aids per lesson",
      "Practice varied tone to maintain energy"
    ]
  }
}
```

---

## Media Service Endpoints

### Generate Text-to-Speech (MiniMax)

**POST** `/api/tts`

Generate audio from text using MiniMax TTS.

#### Request

```bash
curl -X POST http://localhost:8000/api/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is a sample teaching explanation.",
    "voice_id": "male-qn-qingse",
    "speed": 1.0,
    "emotion": "neutral"
  }'
```

**Parameters**:
- `text` (string, required) — Text to convert to speech (max 10,000 chars)
- `voice_id` (string, required) — See `/api/tts/voices` for available
- `speed` (float, optional) — 0.5 to 2.0. Default: 1.0
- `emotion` (string, optional) — neutral, happy, sad, angry, fearful, disgusted, surprised. Default: "neutral"

#### Response

```json
{
  "audio_url": "https://example.com/audio/file.mp3",
  "duration_ms": 2500,
  "sample_rate": 32000,
  "word_count": 8,
  "format": "mp3"
}
```

---

### Generate Text-to-Speech (ElevenLabs)

**POST** `/api/elevenlabs/tts`

Generate audio from text using ElevenLabs (higher quality).

#### Request

```bash
curl -X POST http://localhost:8000/api/elevenlabs/tts \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Understanding photosynthesis...",
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "model_id": "eleven_multilingual_v2",
    "stability": 0.5,
    "similarity_boost": 0.75,
    "style": 0.0,
    "speed": 1.0
  }'
```

**Parameters**:
- `text` (string, required) — Max 5,000 characters
- `voice_id` (string, optional) — Default: "21m00Tcm4TlvDq8ikWAM" (Rachel, female)
- `model_id` (string, optional) — "eleven_multilingual_v2" (recommended), "eleven_turbo_v2_5" (fast), "eleven_monolingual_v1" (English only)
- `stability` (float, 0.0-1.0) — 0 = expressive, 1 = consistent. Default: 0.5
- `similarity_boost` (float, 0.0-1.0) — How closely to match voice. Default: 0.75
- `style` (float, 0.0-1.0) — Exaggeration level. Default: 0.0
- `speed` (float, 0.7-1.2) — Speech rate. Default: 1.0

#### Response

Returns raw MP3 audio stream:
```
[Binary MP3 Audio]
```

Use `audio/mpeg` Content-Type.

---

### Get Available TTS Voices

**GET** `/api/tts/voices`

List all available voices for TTS services.

#### Response

```json
{
  "voices": [
    {
      "id": "male-qn-qingse",
      "name": "Qingse (Male)",
      "lang": "zh"
    },
    {
      "id": "female-shaonv",
      "name": "Shaonv (Female)",
      "lang": "zh"
    }
  ],
  "emotions": ["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]
}
```

---

### Generate Concept Video

**POST** `/api/video/generate`

Generate an AI-created video explaining a teaching concept.

#### Request

```bash
curl -X POST http://localhost:8000/api/video/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain photosynthesis in 60 seconds",
    "model": "text-to-video",
    "duration": 60,
    "resolution": "1280x720"
  }'
```

**Parameters**:
- `prompt` (string, required) — What concept to explain
- `model` (string, optional) — "text-to-video". Default: "text-to-video"
- `duration` (integer, optional) — 5-60 seconds. Default: 30
- `resolution` (string, optional) — "1280x720" or "1920x1080". Default: "1280x720"

#### Response

```json
{
  "task_id": "uuid-string",
  "status": "queued",
  "message": "Video generation started"
}
```

---

### Check Video Generation Status

**GET** `/api/video/status/{task_id}`

Poll the status of a video generation task.

#### Response

**Pending**:
```json
{
  "task_id": "uuid",
  "status": "Pending",
  "file_id": null,
  "download_url": null
}
```

**Completed**:
```json
{
  "task_id": "uuid",
  "status": "Success",
  "file_id": "file-uuid",
  "video_width": 1280,
  "video_height": 720,
  "download_url": "https://example.com/videos/file.mp4"
}
```

---

## Dashboard & History Endpoints

### Get Dashboard Analytics

**GET** `/api/dashboard`

Summary statistics of all analyses.

#### Response

```json
{
  "total_analyses": 42,
  "total_duration_hours": 234.5,
  "average_clarity_score": 3.8,
  "average_engagement_score": 4.1,
  "recent_analyses": [
    {
      "id": "uuid",
      "timestamp": "2026-03-01T10:30:00Z",
      "duration": 1234,
      "clarity_score": 4.2,
      "engagement_score": 4.0
    }
  ]
}
```

---

### Get Analysis History

**GET** `/api/history?limit=20&offset=0`

List past analyses with pagination.

#### Query Parameters

- `limit` (integer, optional) — Results per page. Default: 20, Max: 100
- `offset` (integer, optional) — Skip N results for pagination. Default: 0

#### Response

```json
{
  "items": [
    {
      "id": "uuid",
      "timestamp": "2026-03-01T10:30:00Z",
      "title": "Biology Class - Photosynthesis",
      "duration_seconds": 1234,
      "clarity_score": 4.2,
      "engagement_score": 4.0,
      "status": "completed"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### Get Feedback for Session

**GET** `/api/feedback/{session_id}`

Retrieve saved AI feedback for a specific teaching session.

#### Response

```json
{
  "session_id": "uuid",
  "timestamp": "2026-03-01T10:30:00Z",
  "strengths": [
    "Clear explanations of complex concepts",
    "Excellent pacing throughout"
  ],
  "areas_for_improvement": [
    "Could incorporate more interactive elements",
    "Gestures felt slightly repetitive"
  ],
  "specific_recommendations": [
    {
      "area": "Engagement",
      "recommendation": "Try using 2-3 thought-provoking questions to boost interactivity",
      "video_timestamp": "12:34"
    }
  ],
  "overall_guidance": "Strong foundational teaching skills with room for creative variation."
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (invalid parameters) |
| 401 | Unauthorized (missing API key) |
| 404 | Not found (invalid endpoint/resource) |
| 413 | Payload too large |
| 500 | Internal server error |
| 502 | Bad gateway (external API error) |
| 503 | Service unavailable |

---

## Rate Limiting

Currently no rate limits. Production should implement per-user quotas:
- Transcription: 1 per minute
- Video generation: 1 per hour
- TTS: 10 per minute

---

## Interactive API Docs

When VoiceTrace is running, full interactive Swagger documentation is available at:

```
http://localhost:8000/docs
```

This allows you to test all endpoints directly from your browser.

---

## Examples

### Example 1: Analyze Local Video

```bash
# 1. Upload video
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@lesson.mp4" \
  -F "language=en"

# Response:
# {
#   "job_id": "abc123",
#   ...
# }

# 2. Get feedback
curl http://localhost:8000/api/feedback/abc123
```

### Example 2: Generate and Speak Feedback

```bash
# 1. Get feedback text
FEEDBACK="Your lesson was clear and well-paced."

# 2. Convert to speech (ElevenLabs)
curl -X POST http://localhost:8000/api/elevenlabs/tts \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$FEEDBACK\"}" \
  -o feedback.mp3

# 3. Download and play
open feedback.mp3  # macOS
```

---

## Changelog

### Version 1.0.0 (March 2026)
- Initial release
- Transcription via Whisper & ElevenLabs
- Body language analysis via Gemini Vision
- Teaching evaluation scoring
- AI feedback generation via MiniMax
- Video generation support
- Voice modulation & TTS

---

Last Updated: March 1, 2026
