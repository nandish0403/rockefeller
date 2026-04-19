from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user
from app.models.alert import Alert
from app.models.crack_report import CrackReport
from app.models.user import User
from app.models.zone import Zone
from app.services.groq_service import (
    generate_alert_explanation,
    generate_risk_summary,
    stream_risk_summary,
)
from app.utils.helpers import get_monsoon_flag


router = APIRouter(prefix="/api/groq", tags=["Groq AI"])


async def _load_zone_or_404(zone_id: str) -> Zone:
    try:
        zone = await Zone.get(zone_id)
    except Exception:
        zone = None
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone


async def _load_alert_or_404(alert_id: str) -> Alert:
    try:
        alert = await Alert.get(alert_id)
    except Exception:
        alert = None
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


async def _build_zone_features(zone: Zone) -> dict:
    crack_reports = await CrackReport.find(CrackReport.zone_id == str(zone.id)).to_list()
    crack_scores = [float(r.ai_risk_score) for r in crack_reports if r.ai_risk_score is not None]
    avg_crack_score = round(sum(crack_scores) / len(crack_scores), 3) if crack_scores else 0.0

    inspection_at = zone.last_updated or zone.created_at or datetime.utcnow()
    days_since_inspection = max(0, (datetime.utcnow() - inspection_at).days)
    is_monsoon = get_monsoon_flag()

    return {
        "rainfall_mm_24h": float(zone.recent_rainfall or 0),
        "blast_count_7d": int(zone.blast_count_7d or 0),
        "avg_crack_score": avg_crack_score,
        "is_monsoon": is_monsoon,
        "days_since_inspection": days_since_inspection,
    }


@router.post("/zones/{zone_id}/summary")
async def zone_summary(
    zone_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    zone = await _load_zone_or_404(zone_id)
    features = await _build_zone_features(zone)

    summary = await run_in_threadpool(
        generate_risk_summary,
        zone.name,
        str(zone.risk_level),
        features,
    )

    return {
        "zone_id": str(zone.id),
        "zone_name": zone.name,
        "risk_level": str(zone.risk_level),
        "summary": summary,
    }


@router.post("/zones/{zone_id}/summary/stream")
async def zone_summary_stream(
    zone_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    zone = await _load_zone_or_404(zone_id)
    features = await _build_zone_features(zone)

    streamer = await run_in_threadpool(
        stream_risk_summary,
        zone.name,
        str(zone.risk_level),
        features,
    )

    return StreamingResponse(
        streamer,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _detect_alert_type(alert: Alert) -> str:
    source = str(alert.trigger_source)
    reason = (alert.trigger_reason or "").lower()

    if source == "blast_threshold" or "blast" in reason:
        return "blast_anomaly"
    if source == "crack_confirmed" or "crack" in reason:
        return "crack_critical"
    if source == "rainfall_threshold" or "rain" in reason:
        return "rainfall_red"
    return "zone_risk_change"


@router.post("/alerts/{alert_id}/explain")
async def alert_explain(
    alert_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    alert = await _load_alert_or_404(alert_id)
    alert_type = _detect_alert_type(alert)

    explanation = await run_in_threadpool(
        generate_alert_explanation,
        alert_type,
        alert.zone_name,
        alert.trigger_reason,
    )

    return {
        "alert_id": str(alert.id),
        "explanation": explanation,
    }