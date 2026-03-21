from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime
from app.models.weather_record import WeatherRecord
from app.api.dependencies import get_current_user, require_officer
from app.core.rule_engine import run_rainfall_check
from app.models.user import User

router = APIRouter(prefix="/api/weather", tags=["weather"])

# Map any incoming warning level string to valid enum values
WARNING_LEVEL_MAP = {
    "none":    "none",
    "normal":  "none",
    "low":     "none",
    "yellow":  "watch",
    "watch":   "watch",
    "orange":  "warning",    # ← fixes your "orange" input
    "warning": "warning",
    "red":     "extreme",
    "extreme": "extreme",
}

def weather_to_dict(w: WeatherRecord) -> dict:
    return {
        "id":           str(w.id),
        "district":     w.district,
        "rainfall_mm":  w.rainfall_mm,
        "warning_level": w.warning_level,
        "trend":        w.trend,
        "recorded_at":  w.recorded_at.isoformat() if w.recorded_at else None,
    }

@router.get("")
async def get_weather(
    district: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    records = await WeatherRecord.find().to_list()
    if district:
        records = [r for r in records if r.district.lower() == district.lower()]
    records.sort(key=lambda r: r.recorded_at or datetime.min, reverse=True)
    return [weather_to_dict(r) for r in records]

@router.get("/{district}")
async def get_weather_by_district(
    district: str,
    current_user: User = Depends(get_current_user),
):
    records = await WeatherRecord.find(
        WeatherRecord.district == district
    ).to_list()
    if not records:
        raise HTTPException(status_code=404, detail="No weather records for this district")
    records.sort(key=lambda r: r.recorded_at or datetime.min, reverse=True)
    return [weather_to_dict(r) for r in records]

@router.post("", status_code=201)
async def create_weather_record(
    body: dict,
    current_user: User = Depends(require_officer),
):
    district    = body.get("district", "")
    rainfall_mm = float(body.get("rainfall_mm", 0))

    if not district:
        raise HTTPException(status_code=400, detail="District is required")

    # Normalize warning level to valid enum value
    raw_level     = body.get("warning_level", "none")
    warning_level = WARNING_LEVEL_MAP.get(raw_level.lower(), "none")

    record = WeatherRecord(
        district      = district,
        rainfall_mm   = rainfall_mm,
        warning_level = warning_level,
        trend         = body.get("trend", "stable"),
        recorded_at   = datetime.utcnow(),        # ← FIXED: was missing
    )
    await record.insert()

    # Trigger rule engine
    await run_rainfall_check(district, rainfall_mm)

    return weather_to_dict(record)
