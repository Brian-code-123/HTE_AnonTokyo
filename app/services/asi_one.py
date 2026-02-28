"""
ASI One AI Agent Client
=======================
OpenAI-compatible client for ASI One (formerly Fetch.ai ASI-1).

Docs: https://docs.asi1.ai/
Base URL: https://api.asi1.ai/v1
"""
from __future__ import annotations

import asyncio
import json
from functools import lru_cache
from typing import Generator

import requests

from app.config import get_settings

ASI_ONE_BASE_URL = "https://api.asi1.ai/v1"
ASI_ONE_MODEL = "asi1-mini"


def _headers() -> dict[str, str]:
    settings = get_settings()
    return {
        "Authorization": f"Bearer {settings.asi_one_api_key}",
        "Content-Type": "application/json",
    }


def chat_completion(
    messages: list[dict],
    *,
    model: str = ASI_ONE_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Synchronous chat completion call to ASI One API.
    Returns the text content of the first choice.
    """
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = requests.post(
        f"{ASI_ONE_BASE_URL}/chat/completions",
        headers=_headers(),
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


async def async_chat_completion(
    messages: list[dict],
    *,
    model: str = ASI_ONE_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 2048,
) -> str:
    """
    Async wrapper around the synchronous call — runs in a thread pool
    so FastAPI's event loop is not blocked.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: chat_completion(messages, model=model, temperature=temperature, max_tokens=max_tokens),
    )


# ── System Prompts ──────────────────────────────────────────────────────────────

COACHING_SYSTEM_PROMPT = """You are an expert educational coach and pedagogical advisor for MentorMirror, 
an AI-powered teaching performance platform. Your role is to analyse a teacher's performance metrics 
from their classroom recordings and provide highly personalised, evidence-based improvement plans.

You have deep expertise in:
- Classroom pedagogy and teaching methodologies
- Voice and pacing techniques for effective instruction
- Body language and non-verbal communication in teaching
- Student engagement strategies
- Curriculum delivery and knowledge scaffolding

When analysing teacher data, you must:
1. Identify the biggest improvement opportunities based on scores and trends
2. Provide specific, actionable advice tailored to their actual scores
3. Acknowledge strengths and build on them
4. Prioritise recommendations by impact (high/medium/low)
5. Give concrete next-lesson action items, not vague advice

Respond ONLY with valid JSON matching the exact schema provided. Do not add any extra text."""

ASSISTANT_SYSTEM_PROMPT = """You are the MentorMirror AI guide — a helpful, concise assistant for teachers 
using MentorMirror, an AI-powered classroom performance analysis platform.

MentorMirror features:
- **Transcribe & Analyse**: Upload video/audio or YouTube URL → get full transcript + scores
- **Full Analysis**: Transcription + body language + rubric + knowledge points in one step
- **AI Coaching**: Personalised teaching improvement plans powered by ASI One AI agent
- **Voice Report**: Text-to-speech synthesis for lesson summaries
- **Video Generator**: AI video creation for lesson concepts
- **Rubric Builder**: Custom evaluation rubrics with weighted dimensions
- **Teacher Timeline**: Track a teacher's progress across multiple lessons
- **Compare Analyses**: Side-by-side comparison of two lesson analyses
- **Feedback Tab**: AI-generated detailed teaching feedback

Your personality: friendly, encouraging, direct. Keep answers concise (2-4 sentences unless detail is needed).
You are powered by ASI One AI (asi1-mini model).
If asked something outside MentorMirror, redirect helpfully back to teaching/the platform."""
