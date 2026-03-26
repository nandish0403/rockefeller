from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import require_officer
from app.models.alert import Alert, TriggerSource
from app.models.notification import NotificationType
from app.models.user import User
from app.models.zone import Zone
from app.services.notification_service import create_notifications_for_users
from app.websocket.manager import ws_manager


router = APIRouter(prefix="/api/emergency", tags=["emergency"])


async def _resolve_zone(zone_ref: str | None) -> Zone | None:
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


async def _legacy_zone_code_for(zone: Zone) -> str | None:
    zones = await Zone.find().sort("created_at").to_list()
    zid = str(zone.id)
    for idx, z in enumerate(zones, start=1):
        if str(z.id) == zid:
            return f"z{idx:03d}"
    return None


@router.post("/broadcast")
async def broadcast_emergency(
    body: dict,
    current_user: User = Depends(require_officer),
):
    zone = await _resolve_zone(body.get("zone_id"))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    message = (body.get("message") or "Emergency evacuation protocol activated. Move to safe muster points immediately.").strip()
    title = (body.get("title") or "EMERGENCY BROADCAST").strip()

    alert = Alert(
        zone_id=str(zone.id),
        zone_name=zone.name,
        district=zone.district,
        risk_level="emergency",
        trigger_reason=message,
        trigger_source=TriggerSource.manual,
        recommended_action="Immediate evacuation and headcount verification.",
        status="active",
        created_at=datetime.utcnow(),
    )
    await alert.insert()

    legacy_code = await _legacy_zone_code_for(zone)
    refs = {ref for ref in [str(zone.id), zone.name, legacy_code] if ref}
    workers = await User.find(User.role == "field_worker").to_list()
    targets = [w for w in workers if w.zone_assigned in refs]
    user_ids = [str(w.id) for w in targets]

    if user_ids:
        await create_notifications_for_users(
            user_ids,
            title=title,
            message=message,
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.warning,
            send_push=True,
        )

        for uid in user_ids:
            await ws_manager.send_to_user(
                uid,
                {
                    "event": "emergency_broadcast",
                    "payload": {
                        "alert_id": str(alert.id),
                        "zone_id": str(zone.id),
                        "zone_name": zone.name,
                        "title": title,
                        "message": message,
                        "created_at": alert.created_at.isoformat(),
                    },
                },
            )

    return {
        "ok": True,
        "alert": {
            "id": str(alert.id),
            "zone_id": alert.zone_id,
            "zone_name": alert.zone_name,
            "risk_level": alert.risk_level,
            "trigger_reason": alert.trigger_reason,
            "created_at": alert.created_at.isoformat(),
        },
        "target_workers": len(user_ids),
    }
