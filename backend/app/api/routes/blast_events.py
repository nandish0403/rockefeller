from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
import re
from app.models.blast_event import BlastEvent
from app.models.zone import Zone
from app.models.alert import Alert
from app.api.dependencies import get_current_user
from app.core.rule_engine import run_blast_check
from app.core.config import settings
from app.services.ml_models import check_blast_anomaly
from app.models.user import User

router = APIRouter(prefix="/api/blast-events", tags=["blast-events"])

def blast_to_dict(b: BlastEvent) -> dict:
    return {
        "id":           str(b.id),
        "zone_id":      b.zone_id,
        "zone_name":    b.zone_name,
        "blast_date":   b.blast_date.isoformat() if b.blast_date else None,
        "intensity":    b.intensity,
        "ppv_reading":  b.ppv_reading,
        "dgms_ppv_limit": b.dgms_ppv_limit,
        "is_ppv_exceedance": b.is_ppv_exceedance,
        "depth_meters": b.depth_meters,        # ← FIXED field name
        "blasts_this_week": b.blasts_this_week,
        "is_anomaly": b.is_anomaly,
        "anomaly_score": b.anomaly_score,
        "anomaly_severity": b.anomaly_severity,
        "explosive_type": b.explosive_type,
        "logged_by":    b.logged_by,           # ← FIXED field name
        "notes":        b.notes,
        "created_at":   b.created_at.isoformat() if b.created_at else None,
    }


async def _resolve_zone(zone_ref: str) -> Optional[Zone]:
    if not zone_ref:
        return None

    ref = str(zone_ref).strip()
    if not ref:
        return None

    try:
        zone = await Zone.get(ref)
        if zone:
            return zone
    except Exception:
        pass

    zone = await Zone.find_one(Zone.name == ref)
    if zone:
        return zone

    match = re.fullmatch(r"z(\d+)", ref.lower())
    if match:
        idx = int(match.group(1)) - 1
        if idx >= 0:
            zones = await Zone.find().sort("created_at").to_list()
            if idx < len(zones):
                return zones[idx]

    return None


def _parse_blast_time(raw_value) -> datetime:
    if raw_value in (None, ""):
        return datetime.utcnow()

    if isinstance(raw_value, datetime):
        return raw_value

    text = str(raw_value).strip()
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid blast_time format; use ISO timestamp")

@router.get("")
async def get_blast_events(
    zone_id:  Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    events = await BlastEvent.find().to_list()
    if zone_id:
        events = [e for e in events if e.zone_id == zone_id]
    events.sort(key=lambda e: e.blast_date or datetime.min, reverse=True)
    return [blast_to_dict(e) for e in events]

@router.post("", status_code=201)
async def create_blast_event(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["field_worker", "safety_officer", "admin"]:
        raise HTTPException(status_code=403, detail="Only field workers/officers can log blast events")

    zone = await _resolve_zone(body.get("zone_id"))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    if body.get("intensity") is None:
        raise HTTPException(status_code=400, detail="intensity is required")
    if body.get("ppv_reading") is None and body.get("ppv") is None:
        raise HTTPException(status_code=400, detail="ppv_reading is required for DGMS monitoring")

    cutoff = datetime.utcnow() - timedelta(days=7)
    recent_blasts = await BlastEvent.find(
        BlastEvent.zone_id == str(zone.id),
        BlastEvent.blast_date >= cutoff,
    ).to_list()
    previous_blasts_7d = len(recent_blasts)
    blasts_this_week = previous_blasts_7d + 1

    blast_time = _parse_blast_time(body.get("blast_time") or body.get("blast_date"))
    intensity = float(body.get("intensity") or 0)
    if intensity < 0:
        raise HTTPException(status_code=400, detail="intensity must be >= 0")

    ppv_reading = float(body.get("ppv_reading") if body.get("ppv_reading") is not None else body.get("ppv"))
    if ppv_reading < 0:
        raise HTTPException(status_code=400, detail="ppv_reading must be >= 0")

    dgms_ppv_limit = float(settings.DGMS_PPV_LIMIT_MM_S)
    is_ppv_exceedance = ppv_reading > dgms_ppv_limit

    depth_meters = float(body.get("depth_meters") or body.get("depth_m") or 0)
    anomaly = check_blast_anomaly(
        intensity=intensity,
        depth_m=depth_meters,
        blasts_per_week=blasts_this_week,
    )

    event = BlastEvent(
        zone_id        = str(zone.id),
        zone_name      = zone.name,
        logged_by      = current_user.name,    # ← FIXED: was reported_by
        blast_date     = blast_time,
        intensity      = intensity,
        ppv_reading    = ppv_reading,
        dgms_ppv_limit = dgms_ppv_limit,
        is_ppv_exceedance = is_ppv_exceedance,
        depth_meters   = depth_meters,
        blasts_this_week = blasts_this_week,
        is_anomaly     = anomaly["is_anomaly"],
        anomaly_score  = anomaly["anomaly_score"],
        anomaly_severity = anomaly["severity"],
        explosive_type = body.get("explosive_type"),
        notes          = body.get("notes"),
        created_at     = datetime.utcnow(),
    )
    await event.insert()

    if anomaly["is_anomaly"]:
        alert = Alert(
            zone_id=str(zone.id),
            zone_name=zone.name,
            district=zone.district,
            risk_level="red" if anomaly["severity"] == "critical" else "orange",
            trigger_reason=f"Blast anomaly detected (score: {anomaly['anomaly_score']})",
            trigger_source="ml_model",
            recommended_action="Pause nearby operations and verify blast safety parameters.",
            status="active",
            created_at=datetime.utcnow(),
        )
        await alert.insert()

    if is_ppv_exceedance:
        ppv_alert = Alert(
            zone_id=str(zone.id),
            zone_name=zone.name,
            district=zone.district,
            risk_level="red" if ppv_reading >= dgms_ppv_limit * 1.5 else "orange",
            trigger_reason=f"PPV {ppv_reading:.2f} mm/s exceeded DGMS limit {dgms_ppv_limit:.2f} mm/s",
            trigger_source="blast_threshold",
            recommended_action="Stop uncontrolled blasting; review charge/delay pattern and resume only after safe PPV.",
            status="active",
            created_at=datetime.utcnow(),
        )
        await ppv_alert.insert()

    crossed_threshold = previous_blasts_7d < settings.BLAST_REEVAL_THRESHOLD <= blasts_this_week
    should_re_evaluate = crossed_threshold or anomaly["is_anomaly"] or is_ppv_exceedance

    # Auto-trigger risk re-evaluation when blast load crosses threshold (or severe blast signal appears).
    if should_re_evaluate:
        await run_blast_check(str(zone.id))

    payload = blast_to_dict(event)
    payload["risk_re_evaluated"] = should_re_evaluate
    payload["re_evaluation_reason"] = (
        "threshold_crossed" if crossed_threshold else
        "ppv_exceedance" if is_ppv_exceedance else
        "blast_anomaly" if anomaly["is_anomaly"] else
        "not_required"
    )
    return payload
