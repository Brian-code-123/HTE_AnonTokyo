# ASI One Integration on Vercel

## Overview

MentorMirror uses ASI One (Agentic Search Interface) as the AI coaching engine. This guide explains how to configure it on Vercel.

## Getting ASI One API Key

1. **Sign up** at https://asi.one/
2. Go to **API Dashboard** or **Settings**
3. Copy your API key (starts with `sk_`)
4. Keep this secret - treat it like a password!

## Adding to Vercel

### Option 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your **MentorMirror** project
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `ASI_ONE_API_KEY`
   - **Value**: `sk_your_actual_key_here`
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project (git push or click Redeploy button)

### Option 2: Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Link to your project
vercel link

# Add environment variable
vercel env add ASI_ONE_API_KEY

# Follow prompts to enter your key and select environments
```

### Option 3: .env File (Local Only)

For local development:

```bash
# Create .env file
echo "ASI_ONE_API_KEY=sk_your_key_here" > .env
```

**⚠️ Never commit .env to Git**

## Testing ASI One Integration

After deployment, test the coaching feature:

1. **Visit your Vercel deployment**: `https://your-project.vercel.app`
2. **Upload a video** or use demo data
3. Go to **For You → AI Coaching**
4. Click **Generate Coaching Plan**
5. You should see AI-generated coaching suggestions

If you see errors:
- Check if `ASI_ONE_API_KEY` is set in Vercel dashboard
- Verify the key is correct (no extra spaces)
- Check Vercel function logs: Dashboard → Function Logs

## How It Works

```
User uploads video
    ↓
Frontend analysis (transcription, body language)
    ↓
Backend creates teacher metrics
    ↓
ASI One LLM generates coaching plan
    ↓
Results sent back to frontend
```

## Vercel Environment Variables

These variables control how ASI One is accessed:

| Variable | Required | Purpose |
|----------|----------|---------|
| `ASI_ONE_API_KEY` | ✅ Yes | Authenticate with ASI One API |

## Troubleshooting

### "API key not valid" error
- Ensure key starts with `sk_`
- No extra spaces around the key
- Key is correctly set in Vercel dashboard

### Coaching plan is empty or generic
- ASI One may be having issues
- Try testing with the chat assistant (doesn't require coaching data)
- Check Vercel function logs

### Timeouts when generating coaching plan
- ASI One response taking > 30 seconds
- May be rate limited
- Try again after a few minutes

### "ASI_ONE_API_KEY is undefined"
- Variable not set in Vercel dashboard
- Variable set for wrong environment (e.g., only "Development" but code is in "Production")
- Timeout or network issue

## Security Best Practices

1. **Never share your API key** - it's equivalent to a password
2. **Never commit keys to Git** - even in private repos
3. **Use Vercel's environment variable system** - not local files
4. **Rotate keys regularly** - if accidentally exposed
5. **Monitor usage** - check your ASI One dashboard for unusual activity

## Vercel Environment Scopes

When adding environment variables, select:
- **Production** - for your main deployment
- **Preview** - for preview deployments (when PRs are merged)
- **Development** - for local testing (run `vercel env pull`)

## Local Development with ASI One

To test locally:

```bash
# Ensure .env has your key
export ASI_ONE_API_KEY=sk_your_key

# Start FastAPI backend
venv/bin/uvicorn app.main:app --port 8000

# In another terminal, start frontend
cd frontend && npm run dev

# Test at http://localhost:5173
```

## Next Steps

1. ✅ Add `ASI_ONE_API_KEY` to Vercel dashboard
2. ✅ Deploy your project
3. ✅ Test AI Coaching feature
4. ✅ (Optional) Add other API keys for transcription, body language, feedback

## Support

- ASI One Docs: https://asi.one/docs
- Vercel Docs: https://vercel.com/docs
- MentorMirror Issues: Check GitHub issues
