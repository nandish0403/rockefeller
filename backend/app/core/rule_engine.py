from datetime import datetime, timedelta
from app.models.zone import Zone
from app.models.alert import Alert
from app.models.blast_event import BlastEvent
from app.models.crack_report import CrackReport
from app.models.weather_record import WeatherRecord

async def _get_zone_features(zone: Zone) -> dict:
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

    return {
        "blast_count_7d":       blast_count,
        "avg_blast_intensity":  round(avg_intensity, 2),
        "rainfall_mm_24h":      latest_rain,
        "rainfall_mm_7d":       round(rain_7d, 2),
        "crack_count_7d":       crack_count,
        "avg_crack_score":      round(avg_crack, 3),
        "critical_crack_flag":  critical_flag,
        "elevation_m":          zone.elevation_m or 300,
        "area_sq_km":           zone.area_sq_km or 100,
        "days_since_inspection":days_since,
    }

async def _create_alert_if_escalated(zone: Zone, old_level: str,
                                      new_level: str, features: dict):
    """Create alert only if risk level actually increased."""
    order = {"green": 0, "yellow": 1, "orange": 2, "red": 3}
    if order.get(new_level, 0) <= order.get(old_level, 0):
        return   # No escalation — no alert

    reasons = []
    if features["blast_count_7d"] >= 5:
        reasons.append(f"{features['blast_count_7d']} blasts in 7 days")
    if features["rainfall_mm_24h"] >= 150:
        reasons.append(f"{features['rainfall_mm_24h']}mm rainfall")
    if features["critical_crack_flag"]:
        reasons.append("critical crack detected")

    trigger = f"ML model escalated zone to {new_level.upper()}. " + \
              (", ".join(reasons) if reasons else "Multiple risk factors combined.")

    alert = Alert(
        zone_id            = str(zone.id),
        zone_name          = zone.name,
        district           = zone.district,
        risk_level         = new_level,
        trigger_reason     = trigger,
        trigger_source     = "ml_model2",
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
        from app.ml.model2_risk_predictor.predict import predict
        new_level, new_score = predict(**features)
    except Exception as e:
        print(f"[RuleEngine] ML model unavailable ({e}), using thresholds.")
        # Fallback thresholds if model.pkl not trained yet
        r = features["rainfall_mm_24h"]
        b = features["blast_count_7d"]
        c = features["critical_crack_flag"]
        if r >= 350 or b >= 10 or c:         new_level, new_score = "red",    0.85
        elif r >= 250 or b >= 5:             new_level, new_score = "orange", 0.60
        elif r >= 150 or b >= 3:             new_level, new_score = "yellow", 0.35
        else:                                new_level, new_score = "green",  0.10

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
