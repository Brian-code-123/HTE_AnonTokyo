"""Per-knowledge-point analysis via Google Gemini.

Identifies each knowledge point taught in the lesson and evaluates both
the content quality and presentation delivery for each one.  The LLM
receives three data sources:
  1. Timestamped transcript
  2. Body language report (if available)
  3. Voice fluctuation timeline (if available)

Returns a structured KnowledgePointReport.
"""
from __future__ import annotations

import json
import logging
import subprocess
import tempfile
from typing import Any

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are an expert pedagogical analyst. You will receive a classroom lesson \
transcript with timestamps, and optionally a body language analysis report \
and a voice fluctuation timeline (scores 0-100 measuring vocal energy and \
pitch variation over time windows).

Your task:
1. Identify every distinct knowledge point or topic the teacher covers.
2. For EACH knowledge point produce a JSON object with these exact keys:

{
  "topic": "Short descriptive title of the knowledge point",
  "timestamp_start": <approximate start time in seconds>,
  "timestamp_end": <approximate end time in seconds>,
  "transcript_excerpt": "1-3 key sentences from the transcript for this point",
  "content_analysis": "Evaluate WHAT was taught: clarity of explanation, accuracy, depth, use of examples/analogies, logical sequencing with adjacent topics. 3-5 sentences.",
  "content_score": <integer 1-4>,
  "presentation_analysis": "Evaluate HOW it was delivered. Reference: (a) Audio/tone — energy level, pitch variation, pacing based on fluctuation scores for this time window if available; (b) Body language — gestures, movement, eye contact from the body language report if available; (c) Verbal delivery — clarity, enthusiasm, engagement techniques. 3-5 sentences.",
  "presentation_score": <integer 1-4>,
  "suggestions": ["1-2 specific, actionable improvement tips for this knowledge point"]
}

Scoring scale:
  1 = Needs Improvement — little evidence of effective teaching
  2 = Adequate — some evidence but inconsistent
  3 = Good — consistent and effective
  4 = Excellent — highly engaging and exemplary

Rules:
- Return ONLY a JSON array of these objects, no markdown fencing, no extra text.
- Order by timestamp_start ascending.
- Base all analysis on evidence from the provided data — do not fabricate.
- If body language or fluctuation data is not provided, focus on transcript evidence for the presentation analysis.
- Scores must be integers 1-4.
- suggestions must be an array of 1-2 strings.
"""


def _call_gemini_json(
    api_key: str,
    model: str,
    system_prompt: str,
    user_text: str,
    max_time: int = 300,
) -> str:
    """Call Gemini streaming API and return the concatenated text response."""
    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"parts": [{"text": user_text}]}],
        "generationConfig": {
            "maxOutputTokens": 16384,
            "temperature": 0.2,
        },
    }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/"
        f"models/{model}:streamGenerateContent?alt=sse"
    )

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False,
    ) as f:
        json.dump(payload, f)
        payload_file = f.name

    result = subprocess.run(
        [
            "curl", "-s", "--max-time", str(max_time), url,
            "-H", f"x-goog-api-key: {api_key}",
            "-H", "Content-Type: application/json",
            "-X", "POST", "-d", f"@{payload_file}",
        ],
        capture_output=True,
        text=True,
    )

    if not result.stdout.strip():
        raise RuntimeError(
            f"Empty Gemini response (curl exit: {result.returncode})"
        )

    text_parts: list[str] = []
    for line in result.stdout.split("\n"):
        line = line.strip()
        if not line.startswith("data: "):
            continue
        try:
            chunk = json.loads(line[6:])
        except json.JSONDecodeError:
            continue
        if "error" in chunk:
            raise RuntimeError(f"Gemini API error: {chunk['error']['message']}")
        for cand in chunk.get("candidates", []):
            for part in cand.get("content", {}).get("parts", []):
                if "text" in part:
                    text_parts.append(part["text"])

    if not text_parts:
        raise RuntimeError(f"No text in Gemini response: {result.stdout[:300]}")

    return "".join(text_parts)


def _parse_json_array(raw: str) -> list[dict]:
    """Extract a JSON array from the LLM response, tolerating markdown fencing."""
    text = raw.strip()
    if text.startswith("```"):
        first_newline = text.index("\n")
        text = text[first_newline + 1:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    arr = json.loads(text)
    if not isinstance(arr, list):
        raise ValueError(f"Expected JSON array, got {type(arr).__name__}")
    return arr


def _clamp_score(val: Any) -> int:
    try:
        s = int(val)
    except (TypeError, ValueError):
        return 2
    return max(1, min(4, s))


def analyze_knowledge_points(
    api_key: str,
    model: str,
    transcript: str,
    body_language_report: str | None = None,
    fluctuation_timeline: list[dict] | None = None,
    max_time: int = 300,
) -> dict:
    """Analyze knowledge points and return a dict matching KnowledgePointReport.

    Returns {"points": [...], "avg_content_score": float, "avg_presentation_score": float}
    """
    user_parts: list[str] = [
        "## Classroom Transcript\n\n",
        transcript,
    ]

    if body_language_report:
        user_parts.extend([
            "\n\n---\n\n## Body Language Analysis Report\n\n",
            body_language_report,
        ])

    if fluctuation_timeline:
        user_parts.append("\n\n---\n\n## Voice Fluctuation Timeline\n\n")
        user_parts.append(
            "Each entry shows a time window and a fluctuation score (0-100). "
            "Higher scores indicate more dynamic vocal delivery (pitch and energy variation). "
            "Lower scores indicate monotone delivery.\n\n"
        )
        for window in fluctuation_timeline:
            ts = window.get("timestamp_start", 0)
            te = window.get("timestamp_end", 0)
            score = window.get("fluctuation_score", 0)
            user_parts.append(
                f"- {ts:.0f}s – {te:.0f}s: fluctuation_score = {score:.1f}\n"
            )

    raw_response = _call_gemini_json(
        api_key, model, _SYSTEM_PROMPT, "".join(user_parts), max_time,
    )

    raw_points = _parse_json_array(raw_response)

    points: list[dict] = []
    for item in raw_points:
        suggestions_raw = item.get("suggestions", [])
        if isinstance(suggestions_raw, str):
            suggestions_raw = [suggestions_raw]

        points.append({
            "topic": str(item.get("topic", "Untitled")),
            "timestamp_start": float(item.get("timestamp_start", 0)),
            "timestamp_end": float(item.get("timestamp_end", 0)),
            "transcript_excerpt": str(item.get("transcript_excerpt", "")),
            "content_analysis": str(item.get("content_analysis", "")),
            "content_score": _clamp_score(item.get("content_score", 2)),
            "presentation_analysis": str(item.get("presentation_analysis", "")),
            "presentation_score": _clamp_score(item.get("presentation_score", 2)),
            "suggestions": [str(s) for s in suggestions_raw][:2],
        })

    content_scores = [p["content_score"] for p in points]
    presentation_scores = [p["presentation_score"] for p in points]

    avg_content = round(sum(content_scores) / len(content_scores), 2) if content_scores else 0.0
    avg_presentation = round(sum(presentation_scores) / len(presentation_scores), 2) if presentation_scores else 0.0

    logger.info(
        "Knowledge point analysis complete: %d points, avg_content=%.2f, avg_presentation=%.2f",
        len(points), avg_content, avg_presentation,
    )

    return {
        "points": points,
        "avg_content_score": avg_content,
        "avg_presentation_score": avg_presentation,
    }
