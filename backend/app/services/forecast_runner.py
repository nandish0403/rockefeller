from datetime import datetime

from app.core.rule_engine import get_zone_features
from app.models.risk_prediction import RiskPrediction
from app.models.zone import Zone
from app.services.ml_models import get_district_forecast, predict_zone_risk
from app.utils.helpers import normalize_probability_score


def _forecast_rainfall_total_7d(district: str) -> float | None:
    forecast = get_district_forecast(district=district, days_ahead=7)
    if "error" in forecast:
        return None

    rows = forecast.get("forecast", [])
    total = sum(float(row.get("rainfall_mm", 0) or 0) for row in rows)
    return round(total, 2)


async def run_daily_risk_forecast(zone_id: str | None = None) -> int:
    if zone_id:
        zone = await Zone.get(zone_id)
        zones = [zone] if zone else []
    else:
        zones = await Zone.find().to_list()
    written = 0

    for zone in zones:
        base_features = await get_zone_features(zone)
        forecast_total_7d = _forecast_rainfall_total_7d(zone.district)

        model_features = dict(base_features)
        if forecast_total_7d is not None:
            model_features["rainfall_mm_7d"] = forecast_total_7d

        result = await predict_zone_risk(zone_id=str(zone.id), zone_name=zone.name, **model_features)
        normalized_score = normalize_probability_score(result["risk_score"])

        stored_features = dict(model_features)
        stored_features["forecast_rainfall_7d_model_mm"] = (
            forecast_total_7d
            if forecast_total_7d is not None
            else float(model_features.get("rainfall_mm_7d", 0) or 0)
        )

        prediction = RiskPrediction(
            zone_id=str(zone.id),
            predicted_at=datetime.utcnow(),
            risk_score=normalized_score,
            risk_level=str(result["risk_label"]),
            model_version="rockefeller_model2_model3_v2",
            features_used=stored_features,
            confidence=normalized_score,
        )
        await prediction.insert()

        zone.risk_level = str(result["risk_label"])
        zone.risk_score = normalized_score
        zone.recent_rainfall = float(model_features.get("rainfall_mm_24h", 0) or 0)
        zone.last_updated = datetime.utcnow()
        await zone.save()

        written += 1

    return written
