# Project Structure Guide

Complete overview of the VoiceTrace project organization.

## 📁 Directory Layout

```
HTE_AnonTokyo/
│
├── 📋 Documentation (Root Level)
│   ├── README.md                 # Main project overview & features
│   ├── INSTALLATION.md           # Step-by-step setup guide
│   ├── CONTRIBUTING.md           # Contribution guidelines
│   ├── LICENSE                   # MIT License
│   └── requirements.txt          # Python dependencies
│
├── 📚 docs/                      # Technical Documentation
│   ├── API.md                    # Complete API reference
│   ├── ARCHITECTURE.md           # System design & data flow
│   └── GITHUB_SECRETS.md         # AWS deployment config
│
├── 🎯 app/                       # Backend (FastAPI)
│   ├── main.py                   # Application entry point
│   ├── config.py                 # Environment & settings
│   ├── lambda_handler.py         # AWS Lambda handler
│   │
│   ├── routes/                   # API endpoint handlers
│   │   ├── analyze.py            # File & YouTube transcription
│   │   ├── full_analysis.py      # Complete analysis pipeline
│   │   ├── media.py              # TTS & video generation
│   │   ├── feedback.py           # Feedback retrieval
│   │   ├── dashboard.py          # Analytics endpoints
│   │   └── upload.py             # S3 file handling
│   │
│   ├── schemas/                  # Pydantic data models
│   │   └── response.py           # Request/response schemas
│   │
│   └── services/                 # Business logic layer
│       ├── transcribe_service.py # Transcription orchestration
│       ├── whisper_service.py    # OpenAI Whisper integration
│       ├── elevenlabs_transcribe.py
│       ├── gemini_body_language.py # Vision analysis
│       ├── gemini_evaluation.py  # Teaching scoring
│       ├── minimax_feedback.py   # AI feedback generation
│       ├── knowledge_point_analysis.py
│       ├── voice_analysis.py     # Audio metrics
│       ├── audio_utils.py        # FFmpeg wrappers
│       ├── s3_upload.py          # AWS S3 integration
│       ├── session_stats.py      # Analytics computation
│       └── persistence.py        # SQLite database operations
│
├── 💻 frontend/                  # React + TypeScript Application
│   ├── index.html                # HTML entry point
│   ├── package.json              # Node dependencies
│   ├── vite.config.ts            # Vite build configuration
│   ├── tsconfig.json             # TypeScript config
│   │
│   ├── src/
│   │   ├── App.tsx               # Root application component
│   │   ├── main.tsx              # React DOM mount
│   │   ├── index.css             # Global styles & CSS variables
│   │   │
│   │   ├── components/           # Reusable React components
│   │   │   ├── Header.tsx        # Navigation & theme toggle
│   │   │   ├── Dashboard.tsx     # Analytics overview
│   │   │   ├── UploadSection.tsx # File upload interface
│   │   │   ├── AnalysisResultView.tsx
│   │   │   ├── VoiceReport.tsx   # ElevenLabs TTS player
│   │   │   ├── VideoGenerator.tsx
│   │   │   ├── KnowledgePointsView.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── FluctuationChart.tsx
│   │   │   ├── Footer.tsx        # Footer with GitHub link
│   │   │   └── ResultView.tsx
│   │   │
│   │   ├── services/             # API & utility services
│   │   │   ├── api.ts            # Axios HTTP client
│   │   │   ├── elevenlabsTTS.ts  # ElevenLabs TTS service
│   │   │   └── minimaxTTS.ts     # MiniMax TTS service
│   │   │
│   │   ├── types/                # TypeScript interfaces
│   │   │   └── index.ts          # All type definitions
│   │   │
│   │   └── hooks/                # Custom React hooks
│   │       └── useTheme.ts       # Dark/light theme switching
│   │
│   ├── dist/                     # Built output (production)
│   └── server.js                 # Development server config
│
├── 🧪 tests/                     # Test & Evaluation Scripts
│   ├── test_tts.py               # ElevenLabs TTS testing
│   └── test_evaluation.py        # Teaching evaluation tests
│
├── 📊 reports/                   # Sample Analysis Reports
│   ├── 00_full_body_language_report.md
│   ├── segment_*.md              # Individual segment analyses
│   └── video_analysis_report.md  # Full video report
│
├── 🐳 Docker Files
│   ├── Dockerfile                # Production Docker image
│   ├── Dockerfile.lambda         # AWS Lambda build
│   └── .dockerignore             # Files to exclude from build
│
├── ⚙️ Configuration Files
│   ├── .env                      # Environment variables (local)
│   ├── .env.example              # Template for .env
│   └── .gitignore                # Git ignore rules
│
└── 📦 Virtual Environment
    └── venv/                     # Python packages (Git ignored)
```

---

## 🎯 Key Files by Purpose

### To Start Developing

| File | Purpose |
|------|---------|
| `INSTALLATION.md` | Complete setup instructions |
| `README.md` | Feature overview & project info |
| `.env.example` | Template for API keys |

### Backend API Development

| Directory | Purpose |
|-----------|---------|
| `app/routes/` | Add new endpoints here |
| `app/services/` | Add AI integration logic |
| `app/schemas/` | Define request/response models |
| `app/config.py` | Environment variable management |

### Frontend Development

| File | Purpose |
|------|---------|
| `frontend/src/components/` | Create new UI components |
| `frontend/src/services/api.ts` | API client (HTTP requests) |
| `frontend/src/types/index.ts` | TypeScript type definitions |
| `frontend/src/index.css` | Global styling & theme variables |

### Deployment & DevOps

| File | Purpose |
|------|---------|
| `Dockerfile` | Production container image |
| `requirements.txt` | Python dependencies |
| `frontend/package.json` | Node.js dependencies |
| `docs/GITHUB_SECRETS.md` | CI/CD & AWS configuration |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `INSTALLATION.md` | Setup guide |
| `CONTRIBUTING.md` | How to contribute |
| `docs/API.md` | API endpoint reference |
| `docs/ARCHITECTURE.md` | System design |

---

## 🔄 Development Workflow

### 1. **Backend Changes**

```bash
# Edit files in app/routes/ or app/services/
# Run backend
venv/bin/uvicorn app.main:app --reload

# Check API docs
open http://localhost:8000/docs
```

### 2. **Frontend Changes**

```bash
# Edit files in frontend/src/
# Run dev server
cd frontend && npm run dev

# Open browser
open http://localhost:5173
```

### 3. **Adding Dependencies**

**Python**:
```bash
venv/bin/pip install <package>
venv/bin/pip freeze > requirements.txt
```

**Node.js**:
```bash
cd frontend
npm install <package>
```

### 4. **Building for Production**

```bash
# Backend: No build needed (FastAPI serves at runtime)

# Frontend: Build static files
cd frontend
npm run build
# Output: frontend/dist/

# Docker: Build complete image
docker build -t voicetrace .
docker run -p 8000:8000 voicetrace
```

---

## 📊 Data Flow by Feature

### Transcription Pipeline
```
User uploads video
    ↓
routes/analyze.py receives file
    ↓
services/audio_utils.py extracts audio
    ↓
services/transcribe_service.py routes to Whisper or ElevenLabs
    ↓
services/persistence.py saves to SQLite
    ↓
Response with transcript + timestamps
```

### Teaching Evaluation Pipeline
```
User uploads video to full-analysis
    ↓
1. Extract transcript (see above)
    ↓
2. gemini_body_language.py analyzes vision frames
    ↓
3. gemini_evaluation.py scores against rubric
    ↓
4. minimax_feedback.py generates AI recommendations
    ↓
5. persistence.py saves complete analysis
    ↓
Response with full evaluation + feedback
```

### TTS/Voice Report
```
User selects voice settings
    ↓
Frontend calls POST /api/elevenlabs/tts
    ↓
routes/media.py routes to elevenlabs_service
    ↓
API key kept secure in backend .env
    ↓
Receives MP3 audio stream
    ↓
Frontend plays in VoiceReport component
```

---

## 🔐 Environment Variables

Located in root `.env` (Git ignored):

```bash
# Required
ELEVENLABS_API_KEY=sk_...          # Voice synthesis
MINIMAX_API_KEY=sk-...             # AI feedback + video

# Optional
GEMINI_API_KEY=...                 # Body language analysis
AWS_ACCESS_KEY_ID=...              # S3 uploads
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

Never commit `.env` to Git — use `.env.example` as template.

---

## 🧪 Testing

### Run Tests

```bash
# Backend
cd /Users/lochunman/Desktop/HTE_AnonTokyo
python tests/test_tts.py            # Direct API test
python tests/test_tts.py --backend  # Proxy test
python tests/test_evaluation.py

# Frontend
cd frontend
npm test
```

### Test Files Location

- `tests/test_tts.py` — ElevenLabs TTS testing
- `tests/test_evaluation.py` — Teaching evaluation tests

---

## 📈 Adding New Features

### New API Endpoint

1. **Create route handler** in `app/routes/yourfeature.py`:
   ```python
   from fastapi import APIRouter
   router = APIRouter(tags=["yourfeature"])
   
   @router.post("/api/yourfeature")
   def your_endpoint(body: YourRequest):
       # Implementation
       return YourResponse(...)
   ```

2. **Register in** `app/main.py`:
   ```python
   from app.routes.yourfeature import router as yourfeature_router
   application.include_router(yourfeature_router)
   ```

3. **Define schemas** in `app/schemas/response.py`:
   ```python
   class YourRequest(BaseModel):
       field1: str
       field2: int
   ```

### New Frontend Component

1. **Create component** in `frontend/src/components/YourComponent.tsx`
2. **Define types** in `frontend/src/types/index.ts`
3. **Add to App.tsx** routing if needed
4. **Style with CSS variables** for theme support

---

## 🚀 Deployment Checklist

- [ ] Review `docs/GITHUB_SECRETS.md` for AWS setup
- [ ] Set production environment variables
- [ ] Run `npm run build` in frontend/ (produces dist/)
- [ ] Build Docker image: `docker build -t voicetrace .`
- [ ] Test locally: `docker run -p 8000:8000 voicetrace`
- [ ] Push to registry / deploy to AWS / your platform

---

## 📞 Getting Help

- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (when running)
- **Code Issues**: Check `docs/API.md` and `docs/ARCHITECTURE.md`
- **Setup Problems**: See `INSTALLATION.md`
- **Contributing**: Read `CONTRIBUTING.md`
- **GitHub**: [Crugo1202/HTE_AnonTokyo](https://github.com/Crugo1202/HTE_AnonTokyo)

---

**Last Updated**: March 1, 2026  
**Maintainer**: VoiceTrace Contributors
