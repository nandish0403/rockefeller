from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user
from app.models.alert import Alert
from app.models.user import User
from app.models.worker_presence import WorkerPresence
from app.models.zone import Zone


router = APIRouter(prefix="/api/presence", tags=["presence"])


def _presence_to_dict(row: WorkerPresence) -> dict:
    return {
        "id": str(row.id),
        "user_id": row.user_id,
        "user_name": row.user_name,
        "zone_id": row.zone_id,
        "zone_name": row.zone_name,
        "status": row.status,
        "last_check_in_at": row.last_check_in_at.isoformat() if row.last_check_in_at else None,
        "last_check_out_at": row.last_check_out_at.isoformat() if row.last_check_out_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


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


def _require_field_worker(current_user: User) -> None:
    if current_user.role != "field_worker":
        raise HTTPException(status_code=403, detail="Field worker access required")


@router.get("/me")
async def get_my_presence(current_user: User = Depends(get_current_user)):
    _require_field_worker(current_user)

    row = await WorkerPresence.find_one(WorkerPresence.user_id == str(current_user.id))
    if not row:
        return {
            "user_id": str(current_user.id),
            "user_name": current_user.name,
            "zone_assigned": current_user.zone_assigned,
            "status": "outside",
            "zone_id": None,
            "zone_name": None,
            "updated_at": None,
        }

    return _presence_to_dict(row)


@router.patch("/me/check-in")
async def check_in(
    body: dict,
    current_user: User = Depends(get_current_user),
):
    _require_field_worker(current_user)

    zone_ref = body.get("zone_id") or current_user.zone_assigned
    zone = await _resolve_zone(zone_ref)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found for check-in")

    now = datetime.utcnow()
    row = await WorkerPresence.find_one(WorkerPresence.user_id == str(current_user.id))
    if not row:
        row = WorkerPresence(
            user_id=str(current_user.id),
            user_name=current_user.name,
            zone_id=str(zone.id),
            zone_name=zone.name,
            status="inside",
            last_check_in_at=now,
            updated_at=now,
            created_at=now,
        )
        await row.insert()
    else:
        row.user_name = current_user.name
        row.zone_id = str(zone.id)
        row.zone_name = zone.name
        row.status = "inside"
        row.last_check_in_at = now
        row.updated_at = now
        await row.save()

    return _presence_to_dict(row)


@router.patch("/me/check-out")
async def check_out(current_user: User = Depends(get_current_user)):
    _require_field_worker(current_user)

    now = datetime.utcnow()
    row = await WorkerPresence.find_one(WorkerPresence.user_id == str(current_user.id))
    if not row:
        row = WorkerPresence(
            user_id=str(current_user.id),
            user_name=current_user.name,
            status="outside",
            last_check_out_at=now,
            updated_at=now,
            created_at=now,
        )
        await row.insert()
    else:
        row.user_name = current_user.name
        row.status = "outside"
        row.last_check_out_at = now
        row.updated_at = now
        await row.save()

    return _presence_to_dict(row)


@router.get("/headcount")
async def get_headcount(
    zone_id: str | None = Query(None),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    rows = await WorkerPresence.find().to_list()
    zones = await Zone.find().to_list()

    zone_filter_ref = None
    if zone_id:
        resolved = await _resolve_zone(zone_id)
        if resolved:
            zone_filter_ref = str(resolved.id)

    payload = []
    for zone in zones:
        zid = str(zone.id)
        if zone_filter_ref and zid != zone_filter_ref:
            continue

        zone_rows = [r for r in rows if r.zone_id == zid]
        inside_rows = [r for r in zone_rows if r.status == "inside"]
        outside_rows = [r for r in zone_rows if r.status == "outside"]

        payload.append(
            {
                "zone_id": zid,
                "zone_name": zone.name,
                "inside_count": len(inside_rows),
                "outside_count": len(outside_rows),
                "total_marked": len(zone_rows),
                "inside_workers": [
                    {
                        "user_id": r.user_id,
                        "user_name": r.user_name,
                        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
                    }
                    for r in inside_rows
                ],
            }
        )

    payload.sort(key=lambda x: x["inside_count"], reverse=True)
    return {"zones": payload, "updated_at": datetime.utcnow().isoformat()}


@router.get("/red-alert-inside")
async def get_red_alert_inside(current_user: User = Depends(get_current_user)):
    _ = current_user

    active_alerts = await Alert.find(Alert.status == "active").to_list()
    target_alerts = [a for a in active_alerts if str(a.risk_level).lower() in ["red", "emergency"]]

    rows = await WorkerPresence.find(WorkerPresence.status == "inside").to_list()

    result = []
    for alert in target_alerts:
        inside = [
            {
                "user_id": r.user_id,
                "user_name": r.user_name,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
            if (r.zone_id and r.zone_id == alert.zone_id) or (r.zone_name and r.zone_name == alert.zone_name)
        ]

        result.append(
            {
                "alert_id": str(alert.id),
                "zone_id": alert.zone_id,
                "zone_name": alert.zone_name,
                "risk_level": alert.risk_level,
                "inside_workers": inside,
                "inside_count": len(inside),
            }
        )

    return {"zones": result, "updated_at": datetime.utcnow().isoformat()}
