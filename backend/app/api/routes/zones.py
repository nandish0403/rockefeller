from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.zone import Zone
from app.schemas.zone import ZoneUpdateRequest
from app.api.dependencies import get_current_user, require_officer
from app.models.user import User

router = APIRouter(prefix="/api/zones", tags=["zones"])

def zone_to_dict(z: Zone) -> dict:
    return {
        "id": str(z.id),
        "name": z.name,
        "mine_name": z.mine_name,
        "district": z.district,
        "risk_level": z.risk_level,
        "risk_score": z.risk_score,
        "latlngs": z.latlngs,
        "soil_type": z.soil_type,
        "slope_angle": z.slope_angle,
        "status": z.status,
        "last_landslide": z.last_landslide,
        "blast_count_7d": z.blast_count_7d,
        "recent_rainfall": z.recent_rainfall,
        "last_updated": z.last_updated.isoformat() if z.last_updated else None,
        "created_at": z.created_at.isoformat() if z.created_at else None,
    }

# ✅ All logged-in users can view zones
@router.get("")
async def get_zones(
    district: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    zones = await Zone.find().to_list()          # ✅ FIXED: was find_all()
    if district:
        zones = [z for z in zones if z.district.lower() == district.lower()]
    if risk_level:
        zones = [z for z in zones if z.risk_level == risk_level]
    if status:
        zones = [z for z in zones if z.status == status]
    return [zone_to_dict(z) for z in zones]

# ✅ All logged-in users can view a single zone
@router.get("/{zone_id}")
async def get_zone(
    zone_id: str,
    current_user: User = Depends(get_current_user),
):
    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone_to_dict(zone)

# 🔒 Only safety_officer / admin can edit zones
@router.patch("/{zone_id}")
async def update_zone(
    zone_id: str,
    body: ZoneUpdateRequest,
    current_user: User = Depends(require_officer),
):
    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    update_data = body.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(zone, key, value)
    zone.last_updated = datetime.utcnow()
    await zone.save()
    return zone_to_dict(zone)
