#!/usr/bin/env python3
"""Quick E2E test for the ElevenLabs TTS endpoint.
Usage:
  # Direct API test (no backend needed):
  python test_tts.py

  # Backend endpoint test (backend must be running):
  python test_tts.py --backend
"""
import sys
import json
import requests

API_KEY  = "sk_c39d862c5f77442a9ee07d3af040e553f63e21e05f3090c1"
VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Rachel
TEXT     = "Hello! This is a Voice Report test from VoiceTrace."

def test_direct():
    print("=== Testing ElevenLabs API directly ===")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
    payload = {
        "text": TEXT,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
            "speed": 1.0,
        },
    }
    try:
        resp = requests.post(
            url,
            headers={
                "xi-api-key": API_KEY,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        print(f"NETWORK ERROR: {exc}")
        return False

    print(f"HTTP status: {resp.status_code}")
    if resp.ok:
        with open("/tmp/test_voice.mp3", "wb") as f:
            f.write(resp.content)
        print(f"SUCCESS: {len(resp.content):,} bytes written to /tmp/test_voice.mp3")
        return True
    else:
        try:
            err = resp.json()
            detail = err.get("detail", {})
            if isinstance(detail, dict):
                status = detail.get("status", "")
                msg    = detail.get("message", str(detail))
                print(f"Error status : {status}")
                print(f"Error message: {msg}")
                if status == "missing_permissions":
                    print()
                    print("━" * 60)
                    print("HOW TO FIX:")
                    print("  1. Go to https://elevenlabs.io/app/settings/api-keys")
                    print("  2. Click 'Edit' on your API key")
                    print("  3. Enable the 'Text to Speech' permission")
                    print("  4. Save and restart the backend")
                    print("━" * 60)
            else:
                print(f"Error detail: {detail}")
        except Exception:
            print(f"Raw error: {resp.text[:300]}")
        return False


def test_backend():
    print("=== Testing backend proxy endpoint ===")
    url = "http://localhost:8000/api/elevenlabs/tts"
    payload = {
        "text": TEXT,
        "voice_id": VOICE_ID,
        "model_id": "eleven_multilingual_v2",
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.0,
        "speed": 1.0,
    }
    try:
        resp = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
    except requests.ConnectionError:
        print("BACKEND NOT RUNNING — start it with: uvicorn app.main:app --reload")
        return False
    except requests.RequestException as exc:
        print(f"NETWORK ERROR: {exc}")
        return False

    print(f"HTTP status: {resp.status_code}")
    if resp.ok:
        with open("/tmp/test_voice_backend.mp3", "wb") as f:
            f.write(resp.content)
        print(f"SUCCESS: {len(resp.content):,} bytes written to /tmp/test_voice_backend.mp3")
        return True
    else:
        try:
            err = resp.json()
            print(f"Error: {err.get('detail', err)}")
        except Exception:
            print(f"Raw error: {resp.text[:300]}")
        return False


if __name__ == "__main__":
    if "--backend" in sys.argv:
        ok = test_backend()
    else:
        ok = test_direct()
    sys.exit(0 if ok else 1)
