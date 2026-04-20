from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user
from app.core.rule_engine import run_blast_check
from app.models.alert import Alert
from app.models.blast_event import BlastEvent
from app.models.notification import NotificationType
from app.models.user import User
from app.models.zone import Zone
from app.services.ml_models import predict_blast_anomaly
from app.services.notification_service import create_notifications_for_users

router = APIRouter(prefix="/api/blasts", tags=["blasts"])


def _target_refs(zone: Zone) -> set[str]:
    return {ref for ref in [str(zone.id), zone.name] if ref}


async def _target_user_ids(zone: Zone) -> list[str]:
    refs = _target_refs(zone)
    users = await User.find().to_list()

    ids: list[str] = []
    for user in users:
        if user.role in ["admin", "safety_officer"]:
            ids.append(str(user.id))
            continue
        if user.zone_assigned in refs:
            ids.append(str(user.id))

    return list(dict.fromkeys(ids))


def _parse_date(value: Optional[str], *, end_of_day: bool = False) -> Optional[datetime]:
    if not value:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    try:
        if len(raw) == 10:
            if end_of_day:
                raw = f"{raw}T23:59:59"
            else:
                raw = f"{raw}T00:00:00"
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        return datetime.fromisoformat(raw)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {value}")


def _combine_blast_datetime(blast_date: str, blast_time: str) -> datetime:
    date_raw = str(blast_date or "").strip()
    time_raw = str(blast_time or "").strip()
    if not date_raw or not time_raw:
        raise HTTPException(status_code=400, detail="blast_date and blast_time are required")

    try:
        return datetime.fromisoformat(f"{date_raw}T{time_raw}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid blast_date or blast_time format")


async def _resolve_zone(zone_ref: str) -> Optional[Zone]:
    ref = str(zone_ref or "").strip()
    if not ref:
        return None

    try:
        zone = await Zone.get(ref)
        if zone:
            return zone
    except Exception:
        pass

    return await Zone.find_one(Zone.name == ref)


def _blast_to_dict(event: BlastEvent) -> dict:
    return {
        "id": str(event.id),
        "zone_id": event.zone_id,
        "zone_name": event.zone_name,
        "blast_date": event.blast_date.isoformat() if event.blast_date else None,
        "blast_time": event.blast_time,
        "intensity": event.intensity,
        "depth_m": event.depth_meters,
        "blasts_per_week": event.blasts_this_week,
        "charge_weight_kg": event.charge_weight_kg,
        "detonator_type": event.detonator_type,
        "remarks": event.notes,
        "is_anomaly": event.is_anomaly,
        "anomaly_score": event.anomaly_score,
        "severity": event.anomaly_severity,
        "logged_by": event.logged_by,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


@router.post("", status_code=201)
async def create_blast(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["field_worker", "safety_officer", "admin"]:
        raise HTTPException(status_code=403, detail="Only field workers/officers/admin can submit blast events")

    zone_id = body.get("zone_id")
    zone = await _resolve_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    required_fields = ["blast_date", "blast_time", "intensity", "depth_m", "blasts_per_week"]
    missing = [field for field in required_fields if body.get(field) in (None, "")]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    blast_dt = _combine_blast_datetime(str(body.get("blast_date")), str(body.get("blast_time")))

    try:
        intensity = float(body.get("intensity"))
        depth_m = float(body.get("depth_m"))
        blasts_per_week = int(body.get("blasts_per_week"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid numeric values for intensity/depth_m/blasts_per_week")

    event = BlastEvent(
        zone_id=str(zone.id),
        zone_name=zone.name,
        logged_by=current_user.name,
        blast_date=blast_dt,
        blast_time=str(body.get("blast_time")),
        intensity=intensity,
        depth_meters=depth_m,
        blasts_this_week=blasts_per_week,
        charge_weight_kg=float(body["charge_weight_kg"]) if body.get("charge_weight_kg") not in (None, "") else None,
        detonator_type=body.get("detonator_type"),
        notes=body.get("remarks"),
        created_at=datetime.utcnow(),
    )
    await event.insert()

    anomaly = predict_blast_anomaly(
        intensity=intensity,
        depth_m=depth_m,
        blasts_per_week=blasts_per_week,
    )
    event.is_anomaly = bool(anomaly.get("is_anomaly"))
    event.anomaly_score = float(anomaly.get("anomaly_score") or 0)
    event.anomaly_severity = str(anomaly.get("severity") or "normal")
    await event.save()

    alert_raised = False
    if event.is_anomaly and event.anomaly_severity in ["critical", "warning"]:
        alert = Alert(
            zone_id=str(zone.id),
            zone_name=zone.name,
            district=zone.district,
            risk_level="red" if event.anomaly_severity == "critical" else "orange",
            trigger_reason=f"Blast anomaly detected (score: {event.anomaly_score})",
            trigger_source="ml_model",
            recommended_action="Pause nearby operations and verify blast parameters.",
            status="active",
            created_at=datetime.utcnow(),
        )
        await alert.insert()
        alert_raised = True

        recipients = await _target_user_ids(zone)
        if recipients:
            severity_label = "critical" if event.anomaly_severity == "critical" else "warning"
            await create_notifications_for_users(
                recipients,
                title="Blast Anomaly Alert",
                message=(
                    f"{zone.name}: {severity_label} blast anomaly detected "
                    f"(score {event.anomaly_score:.2f})."
                ),
                zone_id=str(zone.id),
                zone_name=zone.name,
                notif_type=NotificationType.alert,
                send_push=True,
            )

    await run_blast_check(str(zone.id))

    payload = _blast_to_dict(event)
    payload["alert_raised"] = alert_raised
    return payload


@router.get("")
async def list_blasts(
    zone_id: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    anomaly_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    filters = []
    if zone_id:
        filters.append(BlastEvent.zone_id == str(zone_id))

    start_dt = _parse_date(date_from)
    end_dt = _parse_date(date_to, end_of_day=True)
    if start_dt:
        filters.append(BlastEvent.blast_date >= start_dt)
    if end_dt:
        filters.append(BlastEvent.blast_date <= end_dt)
    if anomaly_only:
        filters.append(BlastEvent.is_anomaly == True)

    rows = await BlastEvent.find(*filters).sort("-blast_date").limit(limit).to_list()

    if district:
        district_zone_ids = {
            str(z.id)
            for z in await Zone.find(Zone.district == district).to_list()
        }
        rows = [row for row in rows if row.zone_id in district_zone_ids]

    return [_blast_to_dict(row) for row in rows]


@router.get("/{blast_id}")
async def get_blast(
    blast_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    row = await BlastEvent.get(blast_id)
    if not row:
        raise HTTPException(status_code=404, detail="Blast event not found")

    return _blast_to_dict(row)
