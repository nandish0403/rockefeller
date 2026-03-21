from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.blast_event import BlastEvent
from app.models.zone import Zone
from app.api.dependencies import get_current_user
from app.core.rule_engine import run_blast_check
from app.models.user import User

router = APIRouter(prefix="/api/blast-events", tags=["blast-events"])

def blast_to_dict(b: BlastEvent) -> dict:
    return {
        "id":           str(b.id),
        "zone_id":      b.zone_id,
        "zone_name":    b.zone_name,
        "blast_date":   b.blast_date.isoformat() if b.blast_date else None,
        "intensity":    b.intensity,
        "depth_meters": b.depth_meters,        # ← FIXED field name
        "explosive_type": b.explosive_type,
        "logged_by":    b.logged_by,           # ← FIXED field name
        "notes":        b.notes,
        "created_at":   b.created_at.isoformat() if b.created_at else None,
    }

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
    zone = await Zone.get(body.get("zone_id"))
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    event = BlastEvent(
        zone_id        = str(zone.id),
        zone_name      = zone.name,
        logged_by      = current_user.name,    # ← FIXED: was reported_by
        blast_date     = datetime.utcnow(),
        intensity      = body.get("intensity"),
        depth_meters   = body.get("depth_meters"),  # ← FIXED: was depth_m
        explosive_type = body.get("explosive_type"),
        notes          = body.get("notes"),
        created_at     = datetime.utcnow(),
    )
    await event.insert()

    # Trigger rule engine
    await run_blast_check(str(zone.id))

    return blast_to_dict(event)
