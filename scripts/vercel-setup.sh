#!/bin/bash
# Quick Vercel Setup Script
# Adds MentorMirror to Vercel and sets up environment variables

set -e

echo "🚀 MentorMirror Vercel Deployment Helper"
echo "========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Check if git is in a repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not a git repository. Run 'git init' and commit your changes."
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""
echo "📝 About to connect your project to Vercel..."
echo "   - Ensure your code is pushed to GitHub/GitLab/Bitbucket"
echo "   - You'll be asked to authorize Vercel"
echo ""

# Link project to Vercel
vercel link --yes

echo ""
echo "✅ Project linked to Vercel"
echo ""
echo "⚙️  Setting up environment variables..."
echo ""
echo "Required variables (minimum for basic functionality):"
echo "  - ASI_ONE_API_KEY (for AI coaching)"
echo ""
echo "Optional variables (for extended features):"
echo "  - ELEVENLABS_API_KEY (for high-quality transcription)"
echo "  - GEMINI_API_KEY (for body language analysis)"
echo "  - MINIMAX_API_KEY (for detailed teacher feedback)"
echo "  - AWS_ACCESS_KEY_ID (for S3 file uploads)"
echo "  - AWS_SECRET_ACCESS_KEY (for S3 file uploads)"
echo "  - S3_UPLOAD_BUCKET (bucket name for large files)"
echo "  - DYNAMODB_TABLE_NAME (for persistent history)"
echo ""
echo "Go to: vercel.com/dashboard/[project-name]/settings/environment-variables"
echo "And add the above variables as needed."
echo ""
echo "✅ Setup complete! Run 'git push' to trigger deployment."
