# VoiceTrace: AI-Powered Teaching Performance Analyzer

**Understand what teachers care about. Pick actionable insights. Explain what matters. Deliver real improvements.**

---

## 🎯 Overview

VoiceTrace is a comprehensive **AI-driven teaching evaluation platform** that helps educators analyze classroom video recordings and receive data-backed feedback for continuous improvement. Using advanced speech recognition, body language analysis, and language models, it provides **objective, actionable insights** rather than subjective opinions.

### The Promise: **Do What You Promised**

- 🎤 **Transcription** — Every word captured accurately (Whisper + ElevenLabs)  
- 👁️ **Body Language Analysis** — Non-verbal communication insights (Gemini Vision)  
- 📊 **Quantified Evaluation** — Teaching metrics that matter (MiniMax + specialized rubrics)  
- 🗣️ **Personalized Feedback** — AI-generated recommendations tailored to your teaching style  
- 🎬 **Visual Explanations** — Concept video generation for demonstration  

---

## 🚀 Features

### 1. **Smart Transcription**
- Real-time audio-to-text with timestamps
- Multi-language support (English, Mandarin, Japanese, etc.)
- Segment-based breakdown for easy navigation

### 2. **Body Language Assessment**
- Detects posture, gestures, facial expressions
- Analyzes engagement and classroom presence
- Provides confidence and clarity metrics

### 3. **Teaching Evaluation**
- Rubric-based assessment on:
  - Teaching clarity
  - Content depth
  - Student engagement techniques
  - Classroom management
- Scoring against industry-standard benchmarks

### 4. **AI-Generated Feedback**
- Contextual recommendations based on recorded teaching
- Specific, actionable improvement suggestions
- Links to video segments where improvements are needed

### 5. **Voice Analytics**
- Pitch variation analysis
- Speaking pace metrics
- Voice stability score
- ElevenLabs TTS for report narration

### 6. **Video Generation**
- Auto-generate concept explanation videos
- Supports multiple styles and durations
- Powered by MiniMax v1

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: CSS Custom Properties (Light/Dark mode support)
- **State Management**: React hooks + context
- **Charts**: Custom visualization components

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: SQLite (analytics + history)
- **Media Processing**: FFmpeg
- **AI Services**:
  - OpenAI Whisper (transcription)
  - ElevenLabs (TTS + transcription endpoints)
  - Google Gemini (body language + evaluation)
  - MiniMax (feedback, video generation)

### Infrastructure
- **Containerization**: Docker
- **AWS Integration**: Presigned S3 URLs (large file upload)
- **Cloud Deployment**: AWS Lambda (optional serverless mode)

---

## 📋 System Requirements

- **Python**: 3.12+
- **Node.js**: 18+ (frontend)
- **FFmpeg**: For video/audio processing
- **System RAM**: 4GB+ recommended

---

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Crugo1202/HTE_AnonTokyo.git
cd HTE_AnonTokyo
```

### 2. Backend Setup
```bash
# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file with API keys
cp .env.example .env
# Edit .env and add:
export ELEVENLABS_API_KEY=sk_...
export MINIMAX_API_KEY=sk-...
# export GEMINI_API_KEY=...    (optional)
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Running Locally

**Terminal 1 — Backend (runs on port 8000)**
```bash
venv/bin/uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend (runs on port 5173)**
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🐳 Docker Deployment

### Build & Run
```bash
docker build -t voicetrace .
docker run -p 8000:8000 \
  -e ELEVENLABS_API_KEY=sk_... \
  -e MINIMAX_API_KEY=sk-... \
  voicetrace
```

Then visit [http://localhost:8000](http://localhost:8000)

---

## 📍 API Endpoints

### Core Analysis
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | Upload & transcribe video/audio file |
| `/api/analyze/youtube` | POST | Analyze YouTube classroom video |
| `/api/full-analysis` | POST | Complete analysis (transcription + body language + evaluation) |

### Media Services
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tts` | POST | Generate text-to-speech (MiniMax) |
| `/api/elevenlabs/tts` | POST | Generate text-to-speech (ElevenLabs) |
| `/api/tts/voices` | GET | Available TTS voices |
| `/api/video/generate` | POST | Generate concept video |
| `/api/video/status/{task_id}` | GET | Check video generation status |

### Dashboard & History
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/dashboard` | GET | Get analytics summary |
| `/api/history` | GET | List past analyses |
| `/api/feedback/{session_id}` | GET | Retrieved saved feedback |

Full OpenAPI docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🎮 Usage Workflow

1. **Upload** a classroom video (MP4, MOV, or YouTube link)
2. **Wait** for transcription & analysis (2-5 minutes depending on video length)
3. **Review**:
   - Transcript with word-level timestamps
   - Body language assessment charts
   - Teaching evaluation scores
   - AI-generated feedback with video references
4. **Download** report or share with colleagues
5. **Generate** concept explanation videos for your next class

---

## 🧪 Testing

### Quick Test: TTS Backend
```bash
cd /Users/lochunman/Desktop/HTE_AnonTokyo
python test_tts.py           # Test direct ElevenLabs API
python test_tts.py --backend # Test backend proxy
```

### Evaluation Test
```bash
python test_evaluation.py
```

---

## 📦 Project Structure

```
HTE_AnonTokyo/
├── app/                          # Backend (FastAPI)
│   ├── routes/                   # API endpoints
│   │   ├── analyze.py
│   │   ├── media.py
│   │   ├── feedback.py
│   │   ├── dashboard.py
│   │   └── full_analysis.py
│   ├── services/                 # Business logic
│   │   ├── transcribe_service.py
│   │   ├── elevenlabs_transcribe.py
│   │   ├── gemini_body_language.py
│   │   ├── gemini_evaluation.py
│   │   ├── minimax_feedback.py
│   │   ├── voice_analysis.py
│   │   └── s3_upload.py
│   ├── schemas/                  # Pydantic models
│   ├── config.py                 # Environment & settings
│   └── main.py                   # App initialization
├── frontend/                     # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── services/             # API client
│   │   ├── types/                # TypeScript interfaces
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── body_language_analysis/       # Sample reports
├── docs/                         # Documentation
├── Dockerfile                    # Container config
├── requirements.txt              # Python dependencies
├── .env.example                  # Template for environment variables
└── README.md                     # This file
```

---

## 🔐 Environment Variables

Create `.env` file in project root:

```bash
# ElevenLabs (Speech synthesis + transcription)
ELEVENLABS_API_KEY=sk_c39d862c5f77442a9ee07d3af040e553f63e21e05f3090c1

# MiniMax (AI feedback + video generation)
MINIMAX_API_KEY=sk-cp-a31fmT29mWKiNTJhZpv3dZi3JzPw8VVWDI1lyChgRO-...

# Google Gemini (body language + teaching evaluation)
# GEMINI_API_KEY=your_gemini_key_here

# AWS (optional, for S3 file uploads)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_REGION=us-east-1
```

---

## 📊 Analysis Outputs

### 1. Transcript Report
- Full text with timestamps
- Word-level timing for video sync
- Language detection

### 2. Voice Analytics
- Pitch variation score
- Speaking pace (WPM)
- Voice stability index
- Emotion detection markers

### 3. Body Language Assessment
- Posture quality
- Gesture frequency & confidence
- Facial engagement score
- Eye contact analysis

### 4. Teaching Evaluation
Scored against rubric:
- **Clarity** (1-5) — How clearly concepts are explained
- **Depth** (1-5) — Thoroughness of content coverage
- **Engagement** (1-5) — Techniques to maintain student interest
- **Management** (1-5) — Classroom control & pacing

### 5. AI Feedback
- 3-5 specific recommendations
- Links to video timestamps for examples
- Actionable next steps

---

## 🚀 Deployment

### Production Checklist
- [ ] Set all required environment variables
- [ ] Use a production database (not SQLite)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up monitoring & logging
- [ ] Test with real classroom videos

### AWS Deployment (Lambda + API Gateway)
See [docs/GITHUB_SECRETS.md](docs/GITHUB_SECRETS.md) for CI/CD setup.

---

## 📝 License

MIT License — Free to use and modify. See LICENSE file for details.

---

## 🤝 Contributing

Found a bug or have a feature request? Open an issue or submit a PR!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💬 Support & Contact

- **Issues**: GitHub Issues (recommended)
- **Documentation**: See `/docs` folder
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (when running locally)

---

## 🙏 Acknowledgments

Built with:
- [OpenAI Whisper](https://github.com/openai/whisper) — Transcription
- [ElevenLabs](https://elevenlabs.io) — Voice synthesis
- [Google Gemini](https://deepmind.google/technologies/gemini/) — Vision & evaluation
- [MiniMax](https://www.minimax.io) — Feedback & video generation
- [FastAPI](https://fastapi.tiangolo.com) — Backend framework
- [React](https://react.dev) — Frontend framework

---

**Last Updated**: March 1, 2026  
**Version**: 1.0.0

---

## 🎯 The VoiceTrace Promise

> We understand what teachers care about—**real, actionable feedback**. We pick the most impactful metrics. We use AI to explain what matters. And we deliver exactly what we promised: **objective, data-driven insights for teaching excellence.**
