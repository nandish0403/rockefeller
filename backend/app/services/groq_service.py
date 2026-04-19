import json
import os
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from fastapi import HTTPException
from groq import Groq


BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _require_client() -> Groq:
    if groq_client is None:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")
    return groq_client


def _risk_prompt(zone_name: str, risk_level: str, features: dict) -> str:
    return (
        "You are a mine safety assistant. Explain in simple words for a mine worker.\n"
        f"Zone: {zone_name}\n"
        f"Risk level: {risk_level}\n"
        "Features:\n"
        f"- rainfall_mm_24h: {features.get('rainfall_mm_24h', 0)}\n"
        f"- blast_count_7d: {features.get('blast_count_7d', 0)}\n"
        f"- avg_crack_score: {features.get('avg_crack_score', 0)}\n"
        f"- is_monsoon: {features.get('is_monsoon', False)}\n"
        f"- days_since_inspection: {features.get('days_since_inspection', 0)}\n\n"
        "Write 3-4 short sentences: why this risk level is assigned and one practical precaution workers should take now."
    )


def generate_risk_summary(zone_name: str, risk_level: str, features: dict) -> str:
    client = _require_client()
    prompt = _risk_prompt(zone_name=zone_name, risk_level=risk_level, features=features)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.4,
            max_tokens=200,
            messages=[
                {
                    "role": "system",
                    "content": "You provide clear and safety-focused explanations for mine workers.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Groq request failed: {exc}")


def generate_alert_explanation(alert_type: str, zone_name: str, trigger_reason: str) -> str:
    client = _require_client()
    prompt = (
        "Write a short plain-English alert message for a mine worker.\n"
        f"Alert type: {alert_type}\n"
        f"Zone: {zone_name}\n"
        f"Trigger reason: {trigger_reason}\n\n"
        "Write exactly 2 short sentences: what happened and what action to take immediately."
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=100,
            messages=[
                {
                    "role": "system",
                    "content": "You write concise, worker-friendly mine safety alerts.",
                },
                {"role": "user", "content": prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Groq request failed: {exc}")


def stream_risk_summary(zone_name: str, risk_level: str, features: dict) -> Generator[str, None, None]:
    client = _require_client()
    prompt = _risk_prompt(zone_name=zone_name, risk_level=risk_level, features=features)

    try:
        stream = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            temperature=0.4,
            max_tokens=200,
            stream=True,
            messages=[
                {
                    "role": "system",
                    "content": "You provide clear and safety-focused explanations for mine workers.",
                },
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Groq request failed: {exc}")

    for chunk in stream:
        try:
            token = chunk.choices[0].delta.content if chunk.choices else None
        except Exception:
            token = None

        if token:
            yield f"data: {json.dumps({'token': token})}\n\n"

    yield "data: [DONE]\n\n"