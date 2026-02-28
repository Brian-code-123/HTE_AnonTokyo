# Vercel Deployment Guide for MentorMirror

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket
3. **ASI One API Key**: Get from https://asi.one/

## Setup Instructions

### 1. Add Project to Vercel

```bash
vercel link                          # Connect to your repo
# or go to vercel.com/new and import your GitHub repository
```

### 2. Configure Environment Variables

In Vercel Dashboard, go to **Project Settings > Environment Variables** and add:

#### Required (for ASI One coaching):
```
ASI_ONE_API_KEY = sk_your_key_here
```

#### Optional (for optional features):
```
ELEVENLABS_API_KEY = your_key
GEMINI_API_KEY = your_key
MINIMAX_API_KEY = your_key
AWS_ACCESS_KEY_ID = your_key
AWS_SECRET_ACCESS_KEY = your_key
S3_UPLOAD_BUCKET = your_bucket_name
DYNAMODB_TABLE_NAME = your_table_name (recommended for production data persistence)
```

### 3. Deploy

```bash
git push                             # Push your changes
# Vercel will automatically build and deploy
```

Or manually deploy:
```bash
vercel deploy --prod
```

## Important Notes

### ⚠️ Data Persistence
- **Default (SQLite)**: Uses `/tmp/mentormirror.db` which is ephemeral. Data may be lost between deployments.
- **Recommended (DynamoDB)**: For production, set up AWS DynamoDB:
  1. Create DynamoDB table with on-demand billing
  2. Set `DYNAMODB_TABLE_NAME` environment variable
  3. Ensure AWS credentials have DynamoDB permissions

### ⚠️ Audio/Video Processing
Vercel serverless functions have limitations on processing large video files due to:
- **Timeout**: Max 60 seconds (CPU-intensive operations may timeout)
- **Memory**: 3GB available
- **No FFmpeg**: Build time is limited

For production video processing, consider:
1. **External service**: Pre-process videos externally, store in S3
2. **AWS Lambda**: Deploy backend to Lambda with custom layer including FFmpeg
3. **Chunked processing**: Split long videos into segments

### Environment Variables Required for Full Functionality

```bash
# AI Coaching (required)
ASI_ONE_API_KEY

# Transcription (optional)
ELEVENLABS_API_KEY

# Body Language Analysis (optional)
GEMINI_API_KEY

# Teacher Feedback (optional)
MINIMAX_API_KEY

# File Storage for Large Uploads (optional but recommended)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_UPLOAD_BUCKET

# Data Persistence in Production (highly recommended)
DYNAMODB_TABLE_NAME
DYNAMODB_REGION (default: us-east-1)
```

## Troubleshooting

### "ASI_ONE_API_KEY is not set"
→ Check Vercel Environment Variables in dashboard. Ensure it's set for correct environments (Production, Preview, Development).

### API calls return 502/504 errors
→ Likely timeout due to large file processing. Use S3 presigned uploads for files > 5MB.

### Data not persisting between deployments
→ Set up DynamoDB. SQLite on `/tmp` is ephemeral in serverless.

### Video transcription times out
→ Videos > 5 minutes may timeout. Consider:
  - Splitting into segments
  - Using external transcription service
  - Increasing timeout (requires Vercel Pro/Enterprise)

## Testing Deployment

After deployment, test the full flow:

1. **Test API**: Visit `https://your-deployment.vercel.app/api/dashboard`
2. **Test Frontend**: Visit `https://your-deployment.vercel.app/`
3. **Test Coaching**: Upload a video and check AI coaching results (requires ASI_ONE_API_KEY)

## Local Development

Still works with local uvicorn:

```bash
# Terminal 1: Backend
cd /Users/lochunman/Desktop/HTE_AnonTokyo
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Switching Between Local and Vercel Deployments

- **Local**: `VITE_API_BASE_URL=/api` or `http://localhost:8000/api`
- **Vercel**: `VITE_API_BASE_URL=/api` (same domain)
