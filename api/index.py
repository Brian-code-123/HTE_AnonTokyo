"""
Vercel Serverless Function - FastAPI ASGI handler
Wraps the FastAPI app with Mangum ASGI adapter for Vercel
"""
from mangum import Mangum
from app.main import app

# Wrap FastAPI app with Mangum ASGI adapter for Vercel
handler = Mangum(app, lifespan="off")
