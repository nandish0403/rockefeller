from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.zone import Zone
from app.schemas.zone import ZoneUpdateRequest
from app.api.dependencies import get_current_user, require_officer
from app.models.user import User
from app.models.history import HistoricalLandslide
from app.core.rule_engine import get_zone_features, simple_risk_score
from app.services.ml_models import get_tomorrow_rainfall, predict_zone_risk
from app.utils.helpers import normalize_probability_score

router = APIRouter(prefix="/api/zones", tags=["zones"])


def _normalize_latlngs(points) -> list[list[float]]:
    normalized: list[list[float]] = []
    if not isinstance(points, list):
        return normalized

    for point in points:
        lat = lng = None
        if isinstance(point, list) and len(point) >= 2:
            lat, lng = point[0], point[1]
        elif isinstance(point, dict):
            lat = point.get("lat", point.get("latitude"))
            lng = point.get("lng", point.get("lon", point.get("longitude")))

        try:
            lat_f = float(lat)
            lng_f = float(lng)
            normalized.append([lat_f, lng_f])
        except (TypeError, ValueError):
            continue

    return normalized

def zone_to_dict(z: Zone) -> dict:
    return {
        "id": str(z.id),
        "name": z.name,
        "mine_name": z.mine_name,
        "district": z.district,
        "risk_level": z.risk_level,
        "risk_score": normalize_probability_score(z.risk_score),
        "latlngs": _normalize_latlngs(z.latlngs),
        "soil_type": z.soil_type,
        "slope_angle": z.slope_angle,
        "elevation_m": z.elevation_m,
        "area_sq_km": z.area_sq_km,
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


@router.get("/{zone_id}/forecast")
async def get_zone_forecast(
    zone_id: str,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    base_features = await get_zone_features(zone)
    tomorrow_rain = get_tomorrow_rainfall(zone.district)

    forecast_features = {
        **base_features,
        "rainfall_mm_24h": tomorrow_rain,
        "rainfall_mm_7d": round(tomorrow_rain * 3, 2),
    }
    prediction = await predict_zone_risk(zone_id=str(zone.id), zone_name=zone.name, **forecast_features)
    predicted_score = normalize_probability_score(prediction["risk_score"])

    return {
        "zone_id": str(zone.id),
        "zone_name": zone.name,
        "district": zone.district,
        "prediction_horizon": "tomorrow",
        "predicted_rainfall_mm_24h": tomorrow_rain,
        "predicted_risk_label": prediction["risk_label"],
        "predicted_risk_score": predicted_score,
        "features_used": forecast_features,
    }

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


# ---------------------------------------------------------------------------
# GET /api/risk-levels
# Returns a fleet-level summary of zone risk levels plus per-zone breakdown.
# ---------------------------------------------------------------------------
risk_levels_router = APIRouter(prefix="/api/risk-levels", tags=["zones"])

@risk_levels_router.get("")
async def get_risk_levels(
    district: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    """
    Returns an aggregated summary of zone risk levels.

    Response includes:
    - ``summary``: count of zones in each risk band (green / yellow / orange / red)
    - ``zones``: per-zone risk snapshot with id, name, risk_level, risk_score,
      district, and a ``simple_risk_score`` calculated from the weighted formula
    """
    zones = await Zone.find().to_list()
    if district:
        zones = [z for z in zones if z.district.lower() == district.lower()]

    summary = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
    zone_rows = []

    for z in zones:
        level = str(z.risk_level)
        if level in summary:
            summary[level] += 1

        historical_count = await HistoricalLandslide.find(
            HistoricalLandslide.zone_id == str(z.id)
        ).count()

        fallback = simple_risk_score(
            rainfall_mm=float(z.recent_rainfall or 0),
            slope_deg=float(z.slope_angle or 0),
            soil_type=z.soil_type,
            blast_count_7d=z.blast_count_7d,
            historical_landslides=historical_count,
        )

        zone_rows.append({
            "id": str(z.id),
            "name": z.name,
            "mine_name": z.mine_name,
            "district": z.district,
            "risk_level": level,
            "risk_score": normalize_probability_score(z.risk_score),
            "simple_risk_score": fallback["risk_score"],
            "simple_risk_level": fallback["risk_level"],
            "last_updated": z.last_updated.isoformat() if z.last_updated else None,
        })

    # Sort: red → orange → yellow → green
    _order = {"red": 0, "orange": 1, "yellow": 2, "green": 3}
    zone_rows.sort(key=lambda r: _order.get(r["risk_level"], 4))

    return {
        "summary": summary,
        "total": len(zone_rows),
        "zones": zone_rows,
    }
