# 🚀 MentorMirror Vercel Deployment - Quick Start

Complete guide to deploy MentorMirror to Vercel with full functionality.

## 5-Minute Setup

### Step 1: Prepare Your Code (1 min)

```bash
# Ensure everything is committed
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Create Vercel Project (1 min)

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Choose "Other" as the framework (we have custom config)
4. Click **Deploy**

### Step 3: Add Environment Variables (2 min)

1. After deployment, go to **Project Settings → Environment Variables**
2. Add required variable:
   ```
   Name: ASI_ONE_API_KEY
   Value: sk_your_key_from_asi_one
   ```
3. Click **Save and Redeploy**

### Step 4: Done! (1 min)

Your deployment is live at `https://your-project-name.vercel.app`

**Test it:**
- Frontend: https://your-project-name.vercel.app
- API: https://your-project-name.vercel.app/api/dashboard
- Coaching: Upload video → For You → AI Coaching

---

## Detailed Configuration

### Environment Variables Needed

**Required for basic functionality:**
- `ASI_ONE_API_KEY` - Get from https://asi.one/

**Optional (for extended features):**

| Variable | Purpose | Get From |
|----------|---------|----------|
| `ELEVENLABS_API_KEY` | Better transcription | https://elevenlabs.io/ |
| `GEMINI_API_KEY` | Body language analysis | https://ai.google.dev/ |
| `MINIMAX_API_KEY` | Detailed teacher feedback | https://www.minimaxi.com/ |
| `AWS_ACCESS_KEY_ID` | S3 file uploads | AWS Console |
| `AWS_SECRET_ACCESS_KEY` | S3 file uploads | AWS Console |
| `S3_UPLOAD_BUCKET` | S3 bucket name | AWS Console |
| `DYNAMODB_TABLE_NAME` | Persistent data storage | AWS Console (recommended) |

---

## What Gets Deployed

### Frontend (Your site)
- React + Vite app
- Location: `frontend/dist/`
- Served by Vercel's CDN
- URL: `https://your-project.vercel.app`

### Backend (API)
- FastAPI Python application
- Location: `api/index.py`
- Runs on Vercel Serverless Functions
- URL: `https://your-project.vercel.app/api`

### Configuration Files
- `vercel.json` - Vercel deployment config
- `api/index.py` - Python ASGI handler (Vercel entry point)
- `.vercelignore` - Files to exclude from deployment

---

## Verification Checklist

After deployment, verify everything works:

```bash
# 1. Check frontend loads
curl https://your-project.vercel.app

# 2. Check API responds
curl https://your-project.vercel.app/api/dashboard

# 3. Check chat endpoint (ASI One integration)
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","history":[]}'
```

---

## Common Issues & Solutions

### ❌ "ASI_ONE_API_KEY is not set"

**Solution:**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Check that `ASI_ONE_API_KEY` exists
3. Ensure it's set for the correct environment (Production)
4. Redeploy your project

### ❌ API returns 502/504 errors

**Solution:**
- Function timeout (>60 seconds)
- Usually due to large video processing
- For videos > 5 minutes, use S3 uploads instead
- Check Vercel function logs for details

### ❌ Data not saved between deployments

**Solution:**
- SQLite in `/tmp` is ephemeral
- Set up DynamoDB for persistent storage:
  1. Create DynamoDB table in AWS
  2. Set `DYNAMODB_TABLE_NAME` env variable
  3. Set AWS credentials in Vercel
  4. Redeploy

### ❌ "Cannot find ffmpeg"

**Known limitation:**
- Vercel doesn't include FFmpeg
- Affects video/audio processing
- Workaround: Use AWS Lambda instead or process externally

### ❌ Large file uploads fail

**Solution:**
- Vercel has 6 MB request limit
- Use S3 presigned uploads for files > 5 MB
- Set `S3_UPLOAD_BUCKET` and AWS credentials

---

## Local Development (Still Works!)

Your local setup continues to work:

```bash
# Terminal 1: Backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend  
cd frontend
npm run dev
```

Access at `http://localhost:5173`

---

## Advanced: DynamoDB Setup (Optional but Recommended)

For production data persistence:

1. **Create DynamoDB Table:**
   - Go to AWS Console → DynamoDB
   - Create table named `mentormirror-data`
   - Partition key: `pk` (String)
   - On-demand billing recommended

2. **Add AWS Credentials to Vercel:**
   - Dashboard → Settings → Environment Variables
   - Add:
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `DYNAMODB_TABLE_NAME=mentormirror-data`

3. **Redeploy** for changes to take effect

---

## Advanced: Custom Domain

1. Go to Project Settings → Domains
2. Add custom domain (e.g., `mentormirror.example.com`)
3. Update DNS records (shown in Vercel)
4. Wait 5-10 minutes for DNS to propagate

---

## Security Checklist

- ✅ Keep `ASI_ONE_API_KEY` private (never in Git)
- ✅ Use Vercel's environment variables (not `vercel.json`)
- ✅ Don't share your MentorMirror URL publicly if contains sensitive data
- ✅ Monitor ASI One API usage for unusual activity
- ✅ Rotate keys if accidentally exposed

---

## Monitoring & Debugging

### Check Deployment Status
- Go to https://vercel.com/dashboard/MentorMirror
- Click **Deployments** to see build history
- Click **Function Logs** for backend errors

### View Real-Time Logs
```bash
vercel logs --prod
```

### Test API Endpoint
```bash
# Frontend was built and deployed
https://your-project.vercel.app

# API is working
https://your-project.vercel.app/api/dashboard

# Chat (ASI One) is working
https://your-project.vercel.app/api/chat
```

---

## Next Steps

1. ✅ Deploy to Vercel (above)
2. 📧 Share your deployment with others: `https://your-project.vercel.app`
3. 🔧 (Optional) Add other API keys for full feature set
4. 🗄️ (Highly recommended) Set up DynamoDB for persistent data
5. 📊 Monitor usage and performance in Vercel dashboard

---

## Support & Resources

- **ASI One API**: https://asi.one/ and https://asi.one/docs
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/

---

## Rollback to Previous Version

If something breaks:

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click three dots → **Redeploy**

Your site will be restored to that version in seconds.

---

Good luck! 🎉
