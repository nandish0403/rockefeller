from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings


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


def generate_report_draft(payload: dict[str, Any]) -> dict[str, Any]:
    if not settings.GEMINI_API_KEY:
        draft = _fallback_draft(payload)
        draft["note"] = "Gemini API key not configured. Returned fallback draft."
        return draft

    model = settings.GEMINI_MODEL or "gemini-1.5-flash"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={settings.GEMINI_API_KEY}"
    )

    prompt = (
        "You generate concise mine safety field reports in JSON only. "
        "Return strict JSON object with keys: title, description, observations, remarks, severity. "
        "Severity must be one of: low, medium, high, critical. "
        f"Input payload: {json.dumps(payload, ensure_ascii=True)}"
    )

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 400,
            "responseMimeType": "application/json",
        },
    }

    request = Request(
        url=url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        raise RuntimeError(f"Gemini HTTP error: {exc.code} {detail[:200]}")
    except URLError as exc:
        raise RuntimeError(f"Gemini connection error: {exc}")
    except Exception as exc:
        raise RuntimeError(f"Gemini request failed: {exc}")

    try:
        parsed = json.loads(raw)
        text = (
            parsed.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        draft = json.loads(text)
    except Exception as exc:
        raise RuntimeError(f"Gemini response parse failed: {exc}")

    fallback = _fallback_draft(payload)
    result = {
        "title": str(draft.get("title") or fallback["title"]),
        "description": str(draft.get("description") or fallback["description"]),
        "observations": str(draft.get("observations") or fallback["observations"]),
        "remarks": str(draft.get("remarks") or fallback["remarks"]),
        "severity": str(draft.get("severity") or fallback["severity"]).lower(),
        "source": "gemini",
    }

    if result["severity"] not in {"low", "medium", "high", "critical"}:
        result["severity"] = fallback["severity"]

    return result
