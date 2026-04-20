from __future__ import annotations

import json
from typing import Any

from groq import Groq
from app.core.config import settings


GROQ_API_KEY = (settings.GROQ_API_KEY or "").strip()
GROQ_MODEL = (settings.GROQ_MODEL or "llama-3.3-70b-versatile").strip()
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def _fallback_draft(payload: dict[str, Any]) -> dict[str, Any]:
    zone_name = (payload.get("zone_name") or "Selected Zone").strip() or "Selected Zone"
    report_type = (payload.get("report_type") or "field observation").replace("_", " ")
    weather = (payload.get("weather_condition") or "unknown weather").replace("_", " ")
    observed = (payload.get("observations") or payload.get("description") or "No extra notes provided.").strip()
    severity = (payload.get("severity") or "medium").lower()

    title = f"{zone_name}: {report_type.title()}"
    description = (
        f"Inspection update from {zone_name}. Ground team observed signs that need review under {weather} conditions."
    )
    remarks = (
        f"Observation summary: {observed[:280]}"
        if observed
        else "Observation summary: Field team requested supervisor review."
    )

    return {
        "title": title,
        "description": description,
        "observations": observed,
        "remarks": remarks,
        "severity": severity if severity in {"low", "medium", "high", "critical"} else "medium",
        "source": "fallback",
    }


def _extract_json_dict(text: str) -> dict[str, Any]:
    cleaned = (text or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            parsed = json.loads(cleaned[start : end + 1])
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}

    return {}


def generate_report_draft(payload: dict[str, Any]) -> dict[str, Any]:
    if groq_client is None:
        draft = _fallback_draft(payload)
        draft["note"] = "GROQ_API_KEY is not configured. Returned fallback draft."
        return draft

    prompt = (
        "You generate concise mine safety field reports in JSON only. "
        "Return strict JSON object with keys: title, description, observations, remarks, severity. "
        "Severity must be one of: low, medium, high, critical. "
        f"Input payload: {json.dumps(payload, ensure_ascii=True)}"
    )

    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=400,
            messages=[
                {
                    "role": "system",
                    "content": "You generate strict JSON output for mine safety field reports.",
                },
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise RuntimeError(f"Groq request failed: {exc}")

    try:
        text = response.choices[0].message.content or ""
        draft = _extract_json_dict(text)
    except Exception as exc:
        raise RuntimeError(f"Groq response parse failed: {exc}")

    fallback = _fallback_draft(payload)
    result = {
        "title": str(draft.get("title") or fallback["title"]),
        "description": str(draft.get("description") or fallback["description"]),
        "observations": str(draft.get("observations") or fallback["observations"]),
        "remarks": str(draft.get("remarks") or fallback["remarks"]),
        "severity": str(draft.get("severity") or fallback["severity"]).lower(),
        "source": "groq",
    }

    if result["severity"] not in {"low", "medium", "high", "critical"}:
        result["severity"] = fallback["severity"]

    return result
