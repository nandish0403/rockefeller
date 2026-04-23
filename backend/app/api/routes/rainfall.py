import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.zone import Zone
from app.services.daily_refresh import run_refresh_pipeline
from app.services.ml_models import get_district_forecast

router = APIRouter(prefix="/api/rainfall", tags=["rainfall"])


def _elevation_level(rain_7d_total: float, slope_angle: float | None) -> str:
    slope = float(slope_angle or 0)
    rain = float(rain_7d_total or 0)

    if slope >= 40 and rain >= 180:
        return "high"
    if slope >= 35 and rain >= 120:
        return "elevated"
    if slope >= 28 and rain >= 90:
        return "watch"
    return "normal"


@router.get("/forecast/{district}")
async def rainfall_forecast(
    district: str,
    days_ahead: int = Query(7, ge=1, le=14),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    forecast = get_district_forecast(district=district, days_ahead=days_ahead)
    if "error" in forecast:
        raise HTTPException(status_code=404, detail=forecast["error"])
    return forecast


@router.get("/zone-risk-flags")
async def rainfall_zone_risk_flags(
    days_ahead: int = Query(7, ge=1, le=14),
    current_user: User = Depends(get_current_user),
):
    _ = current_user

    zones = await Zone.find().to_list()
    by_district: dict[str, dict] = {}
    flags = []

    for zone in zones:
        district = zone.district or "Unknown"
        if district not in by_district:
            forecast = get_district_forecast(district=district, days_ahead=days_ahead)
            by_district[district] = forecast if "error" not in forecast else {"forecast": []}

        forecast_rows = by_district[district].get("forecast", [])
        total_rain = round(sum(float(row.get("rainfall_mm", 0) or 0) for row in forecast_rows), 2)
        max_day_rain = round(max([float(row.get("rainfall_mm", 0) or 0) for row in forecast_rows] or [0.0]), 2)
        level = _elevation_level(total_rain, zone.slope_angle)

        flags.append(
            {
                "zone_id": str(zone.id),
                "zone_name": zone.name,
                "district": district,
                "slope_angle": zone.slope_angle,
                "forecast_days": days_ahead,
                "forecast_rainfall_total_mm": total_rain,
                "forecast_max_daily_mm": max_day_rain,
                "risk_elevation": level,
                "auto_flag": level in ["watch", "elevated", "high"],
            }
        )

    flags.sort(key=lambda x: (x["auto_flag"], x["forecast_rainfall_total_mm"]), reverse=True)
    return {
        "forecast_days": days_ahead,
        "zones": flags,
    }


@router.post("/refresh")
async def refresh_rainfall_data(current_user: User = Depends(require_admin)):
    """
    Admin-only endpoint to run collector + prediction refresh.
    Runs in background and returns immediately.
    """
    try:
        asyncio.create_task(run_refresh_pipeline(trigger=f"api:{current_user.email}"))

        return {
            "status": "refresh_started",
            "message": "Rainfall + prediction refresh initiated in background",
            "triggered_by": current_user.email,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Refresh failed: {str(e)}"
        )
