from fastapi import APIRouter, Depends, Query
from datetime import datetime

from app.api.dependencies import get_current_user
from app.models.history import HistoricalLandslide
from app.models.user import User


router = APIRouter(prefix="/api/history", tags=["history"])


def _history_to_dict(row: HistoricalLandslide) -> dict:
    month = None
    season = "unknown"
    if row.date:
        try:
            parsed = datetime.fromisoformat(str(row.date))
            month = parsed.month
            season = "monsoon" if month in [6, 7, 8, 9] else "dry"
        except Exception:
            pass

    return {
        "id": str(row.id),
        "zone_id": row.zone_id,
        "date": row.date,
        "type": row.type,
        "magnitude": row.magnitude,
        "damage_level": row.damage_level,
        "notes": row.notes,
        "month": month,
        "season": season,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


@router.get("")
async def list_history(
    zone_id: str | None = Query(None),
    year: int | None = Query(None, ge=1900, le=2200),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    rows = await HistoricalLandslide.find().to_list()
    data = [_history_to_dict(r) for r in rows]

    if zone_id:
        zid = str(zone_id).strip()
        data = [d for d in data if str(d.get("zone_id")) == zid]

    if year:
        year_text = f"{year}-"
        data = [d for d in data if str(d.get("date") or "").startswith(year_text)]

    data.sort(key=lambda d: str(d.get("date") or ""), reverse=True)

    season_summary = {
        "monsoon": len([d for d in data if d.get("season") == "monsoon"]),
        "dry": len([d for d in data if d.get("season") == "dry"]),
    }

    return {
        "count": len(data),
        "season_summary": season_summary,
        "events": data,
    }
