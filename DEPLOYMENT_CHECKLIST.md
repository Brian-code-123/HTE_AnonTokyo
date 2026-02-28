# 📋 MentorMirror Vercel Deployment Checklist

Complete this checklist before and after deploying to Vercel.

## Pre-Deployment (Do These First!)

### Code Preparation
- [ ] All changes committed: `git add . && git commit -m "message"`
- [ ] Code pushed to GitHub/GitLab/Bitbucket: `git push origin main`
- [ ] No uncommitted changes: `git status` shows clean working directory
- [ ] Frontend builds locally: `cd frontend && npm run build`
- [ ] Backend runs locally: `python3 -m uvicorn app.main:app --reload`

### Configuration Check
- [ ] `vercel.json` exists in root
- [ ] `api/index.py` exists (Python entry point)
- [ ] `.vercelignore` exists
- [ ] `requirements.txt` has `mangum>=0.17.0`
- [ ] `frontend/package.json` build script: `"build": "tsc && vite build"`

### Environment Variables Prepared
- [ ] ASI One API key obtained from https://asi.one/
- [ ] Other API keys collected (optional):
  - [ ] ElevenLabs
  - [ ] Google Gemini
  - [ ] Minimax
  - [ ] AWS (if using S3/DynamoDB)

### Test Locally
```bash
# Test backend
curl http://localhost:8000/api/dashboard

# Test frontend
open http://localhost:5173

# Test that AI coaching works (requires ASI_ONE_API_KEY in .env)
# Navigate to "For You" → "AI Coaching"
```

---

## Deployment Steps

### Step 1: Create Vercel Project
- [ ] Go to https://vercel.com/new
- [ ] Click "Import Git Repository"
- [ ] Select your repository
- [ ] Select "Other" as framework type
- [ ] Click **Deploy**

### Step 2: Configure Environment Variables
- [ ] Go to Project Settings → Environment Variables
- [ ] **Add Required Variable:**
  - [ ] Name: `ASI_ONE_API_KEY`
  - [ ] Value: (paste your key from asi.one)
  - [ ] Environments: Production, Preview, Development
  - [ ] Click **Save**
  
- [ ] **Add Optional Variables (as needed):**
  - [ ] `ELEVENLABS_API_KEY`
  - [ ] `GEMINI_API_KEY`
  - [ ] `MINIMAX_API_KEY`
  - [ ] `AWS_ACCESS_KEY_ID`
  - [ ] `AWS_SECRET_ACCESS_KEY`
  - [ ] `S3_UPLOAD_BUCKET`
  - [ ] `DYNAMODB_TABLE_NAME`

### Step 3: Trigger Initial Deployment
- [ ] After adding env vars, click **Redeploy**
- [ ] Wait for build to complete (usually 2-3 minutes)
- [ ] Check build logs for any errors

---

## Post-Deployment Verification

### Basic Functionality
- [ ] Frontend loads: https://your-project.vercel.app
- [ ] Dashboard loads with no errors
- [ ] API responds: curl https://your-project.vercel.app/api/dashboard

### API Endpoints
- [ ] `GET /api/dashboard` - Returns dashboard data
- [ ] `POST /api/chat` - ASI One chat endpoint
- [ ] `GET /api/teachers` - Teacher list
- [ ] `POST /api/seed-demo` - Demo data endpoint

### AI Coaching Feature (ASI One)
- [ ] [ ] Upload a video or use demo data
- [ ] [ ] Navigate to "For You" menu
- [ ] [ ] Click "AI Coaching"
- [ ] [ ] Click "Generate Coaching Plan"
- [ ] [ ] Verify plan is generated without errors
- [ ] [ ] Check Vercel logs if it fails

### Chat Feature (ASI One)
- [ ] Open floating chat bubble (bottom right)
- [ ] Send a message: "What is MentorMirror?"
- [ ] Verify response is received
- [ ] Check that chat remembers context

### Video Upload (Optional)
- [ ] Click "Transcribe & Analyse"
- [ ] Upload small test video (< 5 MB)
- [ ] Verify upload completes
- [ ] Wait for transcription to complete

### Dark Mode (Visual Check)
- [ ] Toggle dark mode in header
- [ ] Verify text is readable in dark mode
- [ ] Verify all colors look correct

---

## Monitoring & Debugging

### Check Deployment Status
- [ ] Go to https://vercel.com/dashboard
- [ ] Click your project
- [ ] Check **Deployments** tab (should see your deployment)
- [ ] Check **Function Logs** for any Python errors

### Check Function Logs
```bash
vercel logs --prod
```

Should show successful API requests. Look for errors like:
- `ModuleNotFoundError` (missing dependency)
- `ASI_ONE_API_KEY is not set` (missing env var)
- HTTP 500 errors (backend failure)

### Test with curl
```bash
# Test API
curl https://your-project.vercel.app/api/dashboard

# Test chat endpoint
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","history":[]}'
```

---

## Troubleshooting

### Issue: "ASI_ONE_API_KEY is not set"

**Checklist:**
- [ ] Variable added to Vercel dashboard
- [ ] Variable is set for correct environment (Production)
- [ ] Project was redeployed after adding variable
- [ ] No extra spaces in variable value
- [ ] Variable name is exactly `ASI_ONE_API_KEY` (case-sensitive)

**Fix:**
```bash
# Check locally first
cat .env | grep ASI_ONE

# Redeploy to apply env vars
vercel deploy --prod
```

### Issue: Frontend returns 404

**Checklist:**
- [ ] Frontend built successfully (check build logs)
- [ ] No errors in `frontend/dist/` folder
- [ ] `vercel.json` rewrites are correct
- [ ] Not accessing an internal route that doesn't exist

### Issue: API calls fail (502/504)

**Checklist:**
- [ ] Check Vercel function logs
- [ ] Python error (missing import, syntax error)?
- [ ] Timeout (> 60 seconds)?
- [ ] Out of memory?

**Solutions:**
- Reduce video processing size
- Use S3 for large file uploads
- Check dependencies in `requirements.txt`

### Issue: Data not persisting

**Checklist:**
- [ ] Using SQLite (`/tmp/mentormirror.db` - ephemeral)
- [ ] Need DynamoDB for persistence? Set up:
  - [ ] Create DynamoDB table in AWS
  - [ ] Add `DYNAMODB_TABLE_NAME` env var
  - [ ] Add AWS credentials to Vercel
  - [ ] Redeploy

---

## Performance Optimization (Optional)

To improve speed and reliability:

- [ ] Enable **DynamoDB** for data persistence
- [ ] Set up **S3** for large file storage
- [ ] Enable **CloudFront** (via Vercel for custom domains)
- [ ] Monitor function execution time
- [ ] Consider Vercel Pro for more function memory

---

## Security Checklist

- [ ] Never commit `.env` file
- [ ] API keys stored only in Vercel dashboard
- [ ] CORS configured appropriately (currently all origins)
- [ ] No sensitive data in logs
- [ ] Consider IP restriction if internal tool

---

## Key Metrics to Monitor

| Metric | Target | Check Where |
|--------|--------|-------------|
| Build Time | < 5 min | Vercel Dashboard |
| Function Duration (avg) | < 2s | Vercel Analytics |
| Function Duration (max) | < 30s | Vercel Logs |
| Errors per day | < 5% | Vercel Error Rate |

---

## Rollback Procedure

If something breaks:

1. [ ] Go to Vercel Dashboard → Deployments
2. [ ] Find last working deployment
3. [ ] Click ⋯ (three dots) → Redeploy
4. [ ] Your site will be restored immediately

---

## Handoff Checklist

Ready to share with others?

- [ ] Deployment is stable (no recent errors)
- [ ] All critical features tested
- [ ] Documentation is clear
- [ ] Team knows how to redeploy
- [ ] Backup/disaster plan in place

---

## Support Contacts

If something doesn't work:

1. **Check Vercel Logs**: Most issues visible there
2. **Read ASI One Docs**: https://asi.one/docs
3. **Check FastAPI Docs**: https://fastapi.tiangolo.com/
4. **GitHub Issues**: Check if issue already reported
5. **Vercel Support**: https://vercel.com/help

---

**Date Deployed:** _______________
**Deployed By:** _______________
**Notes:** 

```
[Add any deployment notes here]
```

---

✅ **All Done!** Your MentorMirror is live on Vercel!
