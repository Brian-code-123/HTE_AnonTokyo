#!/bin/bash
# Pre-deployment checklist for Vercel

set -e

echo "🔍 MentorMirror Pre-Deployment Checklist"
echo "========================================"
echo ""

errors=0

# Check Node.js version
echo "1️⃣  Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "   ❌ Node.js not found. Install from https://nodejs.org"
    ((errors++))
else
    node_version=$(node -v)
    echo "   ✅ Node.js $node_version"
fi

# Check Python version
echo "2️⃣  Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "   ❌ Python 3 not found"
    ((errors++))
else
    python_version=$(python3 --version)
    echo "   ✅ $python_version"
fi

# Check if frontend dependencies are installed
echo "3️⃣  Checking frontend dependencies..."
if [ -d "frontend/node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ⚠️  node_modules not found. Run: cd frontend && npm install"
fi

# Check if virtual environment exists
echo "4️⃣  Checking Python virtual environment..."
if [ -d "venv" ] || [ -d ".venv" ]; then
    echo "   ✅ Virtual environment found"
else
    echo "   ⚠️  No virtual environment. Run: python3 -m venv venv && source venv/bin/activate"
fi

# Check if .env exists
echo "5️⃣  Checking environment configuration..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    if grep -q "ASI_ONE_API_KEY=" .env; then
        echo "   ✅ ASI_ONE_API_KEY configured"
    else
        echo "   ⚠️  ASI_ONE_API_KEY not in .env (required for Vercel)"
    fi
else
    echo "   ⚠️  .env file not found. Create from .env.example"
fi

# Check Git status
echo "6️⃣  Checking Git status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    if [ -z "$(git status --porcelain)" ]; then
        echo "   ✅ Working directory clean"
    else
        echo "   ⚠️  Uncommitted changes. Run: git add . && git commit -m 'Pre-deployment'"
    fi
else
    echo "   ❌ Not a git repository"
    ((errors++))
fi

# Check package.json exists
echo "7️⃣  Checking frontend configuration..."
if [ -f "frontend/package.json" ]; then
    echo "   ✅ package.json found"
else
    echo "   ❌ frontend/package.json not found"
    ((errors++))
fi

# Check if build works
echo "8️⃣  Testing frontend build..."
if cd frontend && npm run build &> /dev/null && cd ..; then
    echo "   ✅ Frontend builds successfully"
else
    echo "   ❌ Frontend build failed. Check errors above"
    ((errors++))
fi

# Check requirements.txt
echo "9️⃣  Checking Python dependencies..."
if [ -f "requirements.txt" ]; then
    echo "   ✅ requirements.txt found"
    if grep -q "fastapi" requirements.txt; then
        echo "   ✅ FastAPI dependency present"
    else
        echo "   ⚠️  FastAPI not in requirements.txt"
    fi
    if grep -q "mangum" requirements.txt; then
        echo "   ✅ Mangum dependency present (required for Vercel)"
    else
        echo "   ❌ Mangum not in requirements.txt (required for Vercel)" 
        ((errors++))
    fi
else
    echo "   ❌ requirements.txt not found"
    ((errors++))
fi

# Check vercel.json
echo "🔟 Checking Vercel configuration..."
if [ -f "vercel.json" ]; then
    echo "   ✅ vercel.json found"
else
    echo "   ⚠️  vercel.json not found (will use defaults)"
fi

# Check api/index.py
echo "1️⃣1️⃣ Checking API entry point..."
if [ -f "api/index.py" ]; then
    echo "   ✅ api/index.py found"
else
    echo "   ❌ api/index.py not found (required for Vercel)"
    ((errors++))
fi

echo ""
echo "========================================"
if [ $errors -eq 0 ]; then
    echo "✅ All checks passed! Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "  1. Push your code: git push origin main"
    echo "  2. Import to Vercel: vercel"
    echo "  3. Add environment variables in Vercel dashboard"
    echo "  4. Trigger deployment: git push"
else
    echo "❌ $errors error(s) found. Please fix above issues."
    exit 1
fi
