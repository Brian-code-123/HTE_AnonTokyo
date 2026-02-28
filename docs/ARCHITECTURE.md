# Architecture Overview

VoiceTrace is a modern, full-stack application combining AI-powered analysis with a responsive web interface.

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser (React App)                        │
│                    localhost:5173                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Dashboard │ Transcribe │ Voice Report │ Feedback │ Video │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                         HTTP Requests
                         JSON Responses
                              │
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python)                           │
│                    localhost:8000                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Routes: /api/analyze, /api/tts, /api/video/..., etc.    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           Services & Business Logic                     │    │
│  │  • Transcription (Whisper, ElevenLabs)                 │    │
│  │  • Body Language (Gemini Vision)                       │    │
│  │  • Teaching Evaluation (Custom Rubric)                │    │
│  │  • Feedback Generation (MiniMax LLM)                  │    │
│  │  • Video Generation (MiniMax T2V)                     │    │
│  │  • Voice Analysis (Audio Processing)                  │    │
│  │  • S3 Upload (Presigned URLs)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
          │              │              │              │
          ▼              ▼              ▼              ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  OpenAI │    │ ElevenLabs   │ Google  │    │ MiniMax │
    │ Whisper │    │ API      │    │ Gemini  │    │  API    │
    │ (TTS)   │    │ (TTS+STT)│    │ (Vision)│    │ (LLM)   │
    └─────────┘    └─────────┘    └─────────┘    └─────────┘

          │
          ▼
    ┌──────────────┐
    │ SQLite DB    │
    │ - Sessions   │
    │ - Analytics  │
    │ - History    │
    └──────────────┘
```

---

## Component Architecture

### Frontend (React + TypeScript + Vite)

```
src/
├── App.tsx                    # Main app component with tab routing
├── components/
│   ├── Header.tsx             # Top nav bar + theme toggle
│   ├── Dashboard.tsx          # Analytics overview
│   ├── UploadSection.tsx       # File upload interface
│   ├── AnalysisResultView.tsx # Display transcription + results
│   ├── VoiceReport.tsx        # ElevenLabs TTS player
│   ├── VideoGenerator.tsx     # Video generation UI
│   ├── KnowledgePointsView.tsx # Teaching metrics display
│   ├── Footer.tsx             # Footer with links
│   └── FloatingWidget/        # Floating AI assistant (optional)
├── services/
│   ├── api.ts                 # Axios HTTP client
│   ├── elevenlabsTTS.ts      # ElevenLabs TTS service
│   └── minimaxTTS.ts         # MiniMax TTS service
├── hooks/
│   └── useTheme.ts            # Dark/light mode toggle
├── types/
│   └── index.ts               # TypeScript interfaces
└── index.css                  # Global styles + CSS variables

Theme System:
- CSS custom properties (--bg-base, --text-primary, etc.)
- data-theme="light" | "dark" on <html>
- Smooth transitions between themes
```

### Backend (FastAPI + Python)

```
app/
├── main.py                    # FastAPI app initialization
├── config.py                  # Environment variables (Pydantic Settings)
├── routes/
│   ├── analyze.py             # POST /api/analyze, /api/analyze/youtube
│   ├── full_analysis.py       # POST /api/full-analysis
│   ├── media.py               # TTS, video generation endpoints
│   ├── feedback.py            # Feedback retrieval endpoints
│   ├── dashboard.py           # Analytics endpoints
│   └── upload.py              # S3 presigned URL endpoints
├── schemas/
│   └── response.py            # Pydantic models for requests/responses
├── services/
│   ├── transcribe_service.py  # Audio transcription orchestration
│   ├── elevenlabs_transcribe.py
│   ├── whisper_service.py
│   ├── gemini_body_language.py # Gemini Vision analysis
│   ├── gemini_evaluation.py    # Teaching rubric scoring
│   ├── minimax_feedback.py     # MiniMax-powered feedback
│   ├── knowledge_point_analysis.py
│   ├── voice_analysis.py       # Pitch, pace, stability metrics
│   ├── audio_utils.py          # FFmpeg wrappers
│   ├── s3_upload.py            # AWS S3 presigned URLs
│   ├── session_stats.py        # Analytics computation
│   └── persistence.py          # SQLite operations
└── tests/                      # Unit tests (if any)

Database Schema (SQLite):
- sessions (id, timestamp, file_name, duration_seconds)
- analyses (session_id, analysis_type, result_json)
- feedback (session_id, strengths, improvements, recommendations_json)
```

---

## Data Flow

### Example: Upload & Analyze Video

```
1. User selects video file in UploadSection component
   └─> onFileSelect() → api.analyzeFile()

2. Frontend sends POST /api/analyze with file
   └─> Headers: Content-Type: multipart/form-data
   └─> Body: {file: <binary>, language: "auto"}

3. Backend receive at analyze.py:analyze_file()
   ├─> Save file to temp directory
   ├─> Extract audio using FFmpeg (audio_utils.py)
   ├─> Call transcribe_service.py:transcribe_audio()
   │   ├─> Try Whisper first (90% faster)
   │   ├─> Fallback to ElevenLabs if needed
   │   └─> Extract word-level timestamps
   ├─> Save to SQLite: sessions, analyses tables
   └─> Return TranscriptResult JSON

4. Frontend receives response
   ├─> Display full transcript with segments
   ├─> Extract timestamps for video sync
   └─> Show download/share buttons

5. User can request additional analysis:
   └─> Voice Report → POST /api/elevenlabs/tts
       └─> Backend keeps API key secure
       └─> Generate narrated feedback
```

### Full Analysis Flow

```
POST /api/full-analysis with video
  │
  ├─> 1. Transcription (services/transcribe_service.py)
  │   └─> Returns: full_text, segments[], duration
  │
  ├─> 2. Audio Extraction (audio_utils.py)
  │   └─> Uses FFmpeg to extract video:audio
  │
  ├─> 3. Body Language Analysis (gemini_body_language.py)
  │   ├─> Extract video frames every N seconds
  │   ├─> Send to Gemini Vision API
  │   └─> Returns: posture_score, gesture_freq, engagement_score
  │
  ├─> 4. Teaching Evaluation (gemini_evaluation.py)
  │   ├─> Construct evaluation prompt with:
  │   │   - Transcript text
  │   │   - Body language metrics
  │   │   - Teaching rubric
  │   ├─> Call Gemini for scoring
  │   └─> Returns: clarity, depth, engagement, management scores
  │
  ├─> 5. AI Feedback Generation (minimax_feedback.py)
  │   ├─> Prompt MiniMax LLM with:
  │   │   - Transcript
  │   │   - Analysis results
  │   │   - Teaching context
  │   └─> Returns: strengths, improvements, recommendations
  │
  ├─> 6. Persistence (persistence.py)
  │   └─> Save all results to SQLite
  │
  └─> Return: FullAnalysisResult JSON with all data
```

---

## Technology Decisions

### Why FastAPI + React?

**FastAPI**:
- Automatic OpenAPI docs (`/docs`)
- Built-in validation with Pydantic
- Async support for I/O operations
- Easy to deploy (ASGI servers)
- Seamless AWS Lambda integration

**React**:
- Component-based, reusable UI
- Excellent ecosystem (routing, state, etc.)
- TypeScript for type safety
- Vite for instant HMR in development

### Why SQLite?

- No external database needed for MVP
- Perfect for single-server deployment
- Easy backup and migration
- Can swap for PostgreSQL later

### Why Multiple TTS/Speech Services?

- **Whisper**: Offline capable, accurate
- **ElevenLabs**: Natural voice synthesis, high quality
- **MiniMax**: Alternative Chinese TTS if needed

This redundancy ensures service availability.

### Why Modular Services?

Each AI service (Gemini, MiniMax, ElevenLabs) is in its own file:
- Easy to swap implementations
- Clear separation of concerns
- Simple to add new AI providers
- Straightforward to test

---

## Security Considerations

### API Keys

```python
# .env (NEVER commit to Git)
ELEVENLABS_API_KEY=sk_...
MINIMAX_API_KEY=sk-...

# Read via pydantic.BaseSettings in config.py
settings = get_settings()
api_key = settings.elevenlabs_api_key
```

### File Uploads

- Large files use presigned S3 URLs (Lambda 6MB limit)
- Temp files cleaned up after processing
- FFmpeg sandboxing prevents code injection

### CORS Protection

```python
CORSMiddleware(
    allow_origins=["*"],  # ← Should be restricted in production
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Production: `allow_origins=["https://yourdomain.com"]`

---

## Deployment Options

### Option 1: Docker (Recommended)

```bash
docker build -t voicetrace .
docker run -e ELEVENLABS_API_KEY=... voicetrace
```

Serves frontend + backend on same container, port 8000.

### Option 2: AWS Lambda

```bash
# Dockerfile.lambda builds for Lambda runtime
# API Gateway → Lambda function
# S3 for large file uploads
```

See `docs/GITHUB_SECRETS.md`

### Option 3: Traditional Server

```bash
# Backend: Gunicorn + Uvicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend: Nginx reverse proxy
# Static assets served by frontend build
```

---

## Performance Optimizations

1. **Async I/O**: FastAPI handles concurrent requests
2. **Streaming Uploads**: Large files bypass memory
3. **Lazy Video Frame Extraction**: Only extract necessary frames
4. **Caching**: Database queries cached where possible
5. **Frontend Bundle**: Vite minifies & code-splits automatically

---

## Testing Strategy

### Backend Tests

```bash
pytest tests/
```

- Mocked API calls (don't use real API keys)
- Unit tests for services
- Integration tests for routes

### Frontend Tests

```bash
npm test
```

- Component rendering tests
- API client mocking
- User interaction flows

---

## Monitoring & Logging

```python
# Backend logs to console (Gunicorn/Docker captures)
logger = logging.getLogger(__name__)
logger.info("Event: transcription_started")
logger.error("Error: API response invalid")

# Frontend logs to browser console
console.log("Analysis started...")
```

Production should forward logs to CloudWatch / DataDog / etc.

---

## Scalability Path

As usage grows:

1. **Database**: Migrate from SQLite → PostgreSQL
2. **File Storage**: S3 replaces local temp directory
3. **Async Tasks**: Redis + Celery for long-running jobs
4. **Load Balancing**: Multiple backend instances behind Nginx
5. **CDN**: CloudFront for frontend static assets

---

Last Updated: March 1, 2026
