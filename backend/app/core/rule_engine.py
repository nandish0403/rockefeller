from datetime import datetime, timedelta
from app.models.zone import Zone
from app.models.alert import Alert
from app.models.blast_event import BlastEvent
from app.models.crack_report import CrackReport
from app.models.weather_record import WeatherRecord
from app.models.history import HistoricalLandslide
from app.services.ml_models import predict_zone_risk

# ---------------------------------------------------------------------------
# Simple weighted-sum risk formula (used as fallback when ML model unavailable)
# Risk = 0.40 * rainfall + 0.20 * slope + 0.15 * soil_factor
#       + 0.15 * blast_activity + 0.10 * historical_landslides
# All input components are normalised to [0, 1] before weighting.
# ---------------------------------------------------------------------------
_SOIL_RISK = {
    "clay": 0.9,
    "loam": 0.6,
    "sandy loam": 0.5,
    "sandy": 0.4,
    "rocky": 0.2,
    "gravel": 0.3,
}

def _normalize_rainfall(rainfall_mm: float) -> float:
    """Map rainfall (mm/24h) to a 0–1 score."""
    return min(rainfall_mm / 350.0, 1.0)

def _normalize_slope(slope_deg: float) -> float:
    """Map slope angle (degrees) to a 0–1 score."""
    return min(slope_deg / 60.0, 1.0)

def _soil_factor(soil_type: str | None) -> float:
    """Return soil instability factor in [0, 1]."""
    if not soil_type:
        return 0.5
    return _SOIL_RISK.get(soil_type.lower(), 0.5)

def _normalize_blast_activity(blast_count_7d: int) -> float:
    """Map weekly blast count to a 0–1 score."""
    return min(blast_count_7d / 10.0, 1.0)

def _normalize_historical(historical_count: int) -> float:
    """Map historical landslide count to a 0–1 score."""
    return min(historical_count / 5.0, 1.0)

def simple_risk_score(
    rainfall_mm: float,
    slope_deg: float,
    soil_type: str | None,
    blast_count_7d: int,
    historical_landslides: int,
) -> dict:
    """
    Compute a simple weighted-sum risk score and label.

    Returns a dict with ``risk_score`` (float, 0–1) and ``risk_level``
    (``"green"``, ``"yellow"``, or ``"red"``).
    """
    score = (
        0.40 * _normalize_rainfall(rainfall_mm)
        + 0.20 * _normalize_slope(slope_deg)
        + 0.15 * _soil_factor(soil_type)
        + 0.15 * _normalize_blast_activity(blast_count_7d)
        + 0.10 * _normalize_historical(historical_landslides)
    )
    score = round(min(score, 1.0), 4)

    if score >= 0.6:
        label = "red"
    elif score >= 0.3:
        label = "yellow"
    else:
        label = "green"

    return {"risk_score": score, "risk_level": label}

async def get_zone_features(zone: Zone) -> dict:
    """Build feature dict for a zone from Atlas collections."""
    cutoff = datetime.utcnow() - timedelta(days=7)

    # Blast features
    blasts         = await BlastEvent.find(BlastEvent.zone_id == str(zone.id)).to_list()
    recent_blasts  = [b for b in blasts if b.blast_date and b.blast_date >= cutoff]
    blast_count    = len(recent_blasts)
    avg_intensity  = sum(b.intensity or 0 for b in recent_blasts) / blast_count if blast_count else 0

    # Crack features
    cracks         = await CrackReport.find(CrackReport.zone_id == str(zone.id)).to_list()
    recent_cracks  = [c for c in cracks if c.created_at and c.created_at >= cutoff]
    crack_count    = len(recent_cracks)
    scores         = [c.ai_risk_score for c in recent_cracks if c.ai_risk_score is not None]
    avg_crack      = sum(scores) / len(scores) if scores else 0
    critical_flag  = 1 if any(c.severity == "critical" for c in recent_cracks) else 0

    # Rainfall features (latest record for district)
    weather        = await WeatherRecord.find(
        WeatherRecord.district == zone.district
    ).to_list()
    weather.sort(key=lambda w: w.recorded_at or datetime.min, reverse=True)
    latest_rain    = weather[0].rainfall_mm if weather else 0
    rain_7d        = sum(w.rainfall_mm for w in weather[:7])

    # Zone static features
    days_since = (datetime.utcnow() - zone.last_updated).days if zone.last_updated else 30
    month_now = datetime.utcnow().month

    return {
        "blast_count_7d":       blast_count,
        "avg_blast_intensity":  round(avg_intensity, 2),
        "rainfall_mm_24h":      latest_rain,
        "rainfall_mm_7d":       round(rain_7d, 2),
        "crack_count_7d":       crack_count,
        "avg_crack_score":      round(avg_crack, 3),
        "critical_crack_flag":  critical_flag,
        "elevation_m":          getattr(zone, "elevation_m", 300) or 300,
        "area_sq_km":           getattr(zone, "area_sq_km", 100) or 100,
        "days_since_inspection":days_since,
        "is_monsoon":           1 if month_now in [6, 7, 8, 9] else 0,
    }


async def _get_zone_features(zone: Zone) -> dict:
    return await get_zone_features(zone)

async def _create_alert_if_escalated(zone: Zone, old_level: str,
                                      new_level: str, features: dict):
    """Create alert if risk level escalates or remains red."""
    order = {"green": 0, "yellow": 1, "orange": 2, "red": 3}
    if order.get(new_level, 0) <= order.get(old_level, 0) and new_level != "red":
        return

    reasons = []
    if features["blast_count_7d"] >= 5:
        reasons.append(f"{features['blast_count_7d']} blasts in 7 days")
    if features["rainfall_mm_24h"] >= 150:
        reasons.append(f"{features['rainfall_mm_24h']}mm rainfall")
    if features["critical_crack_flag"]:
        reasons.append("critical crack detected")

    trigger = f"ML model set zone to {new_level.upper()}. " + \
              (", ".join(reasons) if reasons else "Multiple risk factors combined.")

    alert = Alert(
        zone_id            = str(zone.id),
        zone_name          = zone.name,
        district           = zone.district,
        risk_level         = new_level,
        trigger_reason     = trigger,
        trigger_source     = "ml_model",
        recommended_action = {
            "red":    "Halt operations. Immediate inspection required.",
            "orange": "Reduce activity. Monitor closely.",
            "yellow": "Alert field workers. Increase inspection frequency.",
        }.get(new_level),
        status             = "active",
        created_at         = datetime.utcnow(),
    )
    await alert.insert()

async def run_zone_risk_update(zone_id: str):
    """
    Main entry point — called after any blast/crack/weather event.
    Uses ML model if available, falls back to thresholds.
    """
    zone = await Zone.get(zone_id)
    if not zone:
        return

    old_level = zone.risk_level
    features  = await _get_zone_features(zone)

    try:
        result = predict_zone_risk(**features)
        new_level = str(result["risk_label"])
        new_score = float(result["risk_score"])
    except Exception as e:
        print(f"[RuleEngine] ML model unavailable ({e}), using simple risk formula.")
        landslide_count = await HistoricalLandslide.find(
            HistoricalLandslide.zone_id == str(zone.id)
        ).count()
        fallback = simple_risk_score(
            rainfall_mm=features["rainfall_mm_24h"],
            slope_deg=float(zone.slope_angle or 0),
            soil_type=zone.soil_type,
            blast_count_7d=features["blast_count_7d"],
            historical_landslides=landslide_count,
        )
        new_level = fallback["risk_level"]
        new_score = fallback["risk_score"]
        # Promote "yellow" to "orange" when a critical crack is flagged
        if new_level == "yellow" and features["critical_crack_flag"]:
            new_level, new_score = "orange", max(new_score, 0.48)

    # Update zone in Atlas
    zone.risk_level   = new_level
    zone.risk_score   = new_score
    zone.blast_count_7d  = features["blast_count_7d"]
    zone.recent_rainfall = features["rainfall_mm_24h"]
    zone.last_updated    = datetime.utcnow()
    await zone.save()

    # Create alert if risk escalated
    await _create_alert_if_escalated(zone, old_level, new_level, features)
    print(f"[RuleEngine] {zone.name}: {old_level} → {new_level} (score: {new_score:.2f})")

# Keep old function names so existing routes don't break
async def run_blast_check(zone_id: str):
    await run_zone_risk_update(zone_id)

async def run_rainfall_check(district: str, rainfall_mm: float):
    zones = await Zone.find(Zone.district == district).to_list()
    for zone in zones:
        await run_zone_risk_update(str(zone.id))

async def run_crack_check(zone_id: str, ai_risk_score: float):
    await run_zone_risk_update(zone_id)
