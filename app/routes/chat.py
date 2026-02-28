"""
ASI One Chat Route — AI Guide Chatbot
======================================
Powers the floating AssistantWidget with live ASI One responses.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.asi_one import async_chat_completion, ASSISTANT_SYSTEM_PROMPT

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest):
    """
    Forward a chat message to ASI One AI and return the response.
    Maintains conversation history for context-aware replies.
    """
    messages: list[dict] = [{"role": "system", "content": ASSISTANT_SYSTEM_PROMPT}]

    # Add conversation history (max last 10 turns to keep tokens reasonable)
    for h in body.history[-10:]:
        messages.append({"role": h.role, "content": h.content})

    # Add current user message
    messages.append({"role": "user", "content": body.message})

    try:
        reply = await async_chat_completion(messages, temperature=0.65, max_tokens=512)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ASI One API error: {e}")
