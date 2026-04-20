from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.alert import Alert
from app.models.notification import NotificationType
from app.schemas.alert import CreateAlertRequest
from app.api.dependencies import get_current_user, require_officer, require_admin
from app.models.user import User
from app.services.notification_service import create_notifications_for_users

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _target_refs(zone_id: str | None, zone_name: str | None) -> set[str]:
    return {ref for ref in [zone_id, zone_name] if ref}


async def _target_user_ids(zone_id: str | None, zone_name: str | None) -> list[str]:
    refs = _target_refs(zone_id, zone_name)
    users = await User.find().to_list()

    ids: list[str] = []
    for user in users:
        if user.role in ["admin", "safety_officer"]:
            ids.append(str(user.id))
            continue
        if refs and user.zone_assigned in refs:
            ids.append(str(user.id))

    # Preserve order while removing duplicates.
    return list(dict.fromkeys(ids))

def alert_to_dict(a: Alert) -> dict:
    return {
        "id": str(a.id),
        "zone_id": a.zone_id,
        "zone_name": a.zone_name,
        "district": a.district,
        "risk_level": a.risk_level,
        "trigger_reason": a.trigger_reason,
        "trigger_source": a.trigger_source,
        "recommended_action": a.recommended_action,
        "status": a.status,
        "acknowledged_by": a.acknowledged_by,
        "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        "resolved_by": a.resolved_by,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }

# ✅ All logged-in users can view alerts
@router.get("")
async def get_alerts(
    status: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    alerts = await Alert.find().to_list()        # ✅ FIXED: was find_all()
    if status:
        alerts = [a for a in alerts if a.status == status]
    if district:
        alerts = [a for a in alerts if a.district.lower() == district.lower()]
    if risk_level:
        alerts = [a for a in alerts if a.risk_level == risk_level]
    if zone_id:
        alerts = [a for a in alerts if a.zone_id == zone_id]
    alerts.sort(key=lambda a: a.created_at or datetime.min, reverse=True)
    return [alert_to_dict(a) for a in alerts]

# ✅ All logged-in users can view a single alert
@router.get("/{alert_id}")
async def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
):
    alert = await Alert.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert_to_dict(alert)

# 🔒 Only safety_officer / admin can create manual alerts
@router.post("", status_code=201)
async def create_alert(
    body: CreateAlertRequest,
    current_user: User = Depends(require_officer),
):
    alert = Alert(
        zone_id=body.zone_id,
        zone_name=body.zone_name,
        district=body.district,
        risk_level=body.risk_level,
        trigger_reason=body.trigger_reason,
        trigger_source=body.trigger_source,
        recommended_action=body.recommended_action,
        status="active",
        created_at=datetime.utcnow(),
    )
    await alert.insert()

    recipients = await _target_user_ids(alert.zone_id, alert.zone_name)
    if recipients:
        await create_notifications_for_users(
            recipients,
            title="New Alert",
            message=f"{alert.zone_name}: {alert.trigger_reason}",
            zone_id=alert.zone_id,
            zone_name=alert.zone_name,
            notif_type=NotificationType.alert,
            send_push=True,
        )

    return alert_to_dict(alert)

# 🔒 Only safety_officer / admin can acknowledge
@router.patch("/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(require_officer),
):
    alert = await Alert.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    alert.acknowledged_by = current_user.name
    alert.acknowledged_at = datetime.utcnow()
    await alert.save()

    recipients = await _target_user_ids(alert.zone_id, alert.zone_name)
    if recipients:
        await create_notifications_for_users(
            recipients,
            title="Alert Acknowledged",
            message=f"{alert.zone_name}: acknowledged by {current_user.name}.",
            zone_id=alert.zone_id,
            zone_name=alert.zone_name,
            notif_type=NotificationType.info,
            send_push=True,
        )

    return alert_to_dict(alert)

# 🔒 Only admin can resolve
@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(require_admin),
):
    alert = await Alert.get(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_by = current_user.name
    alert.resolved_at = datetime.utcnow()
    await alert.save()

    recipients = await _target_user_ids(alert.zone_id, alert.zone_name)
    if recipients:
        await create_notifications_for_users(
            recipients,
            title="Alert Resolved",
            message=f"{alert.zone_name}: resolved by {current_user.name}.",
            zone_id=alert.zone_id,
            zone_name=alert.zone_name,
            notif_type=NotificationType.info,
            send_push=True,
        )

    return alert_to_dict(alert)
