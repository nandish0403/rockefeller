from datetime import datetime

from app.core.rule_engine import get_zone_features
from app.models.risk_prediction import RiskPrediction
from app.models.zone import Zone
from app.services.ml_models import get_tomorrow_rainfall, predict_zone_risk
from app.utils.helpers import normalize_probability_score


async def run_daily_risk_forecast(zone_id: str | None = None) -> int:
    if zone_id:
        zone = await Zone.get(zone_id)
        zones = [zone] if zone else []
    else:
        zones = await Zone.find().to_list()
    written = 0

    for zone in zones:
        base_features = await get_zone_features(zone)
        predicted_rain = get_tomorrow_rainfall(zone.district)
        forecast_features = {
            **base_features,
            "rainfall_mm_24h": predicted_rain,
            "rainfall_mm_7d": round(predicted_rain * 3, 2),
        }
        result = await predict_zone_risk(zone_id=str(zone.id), zone_name=zone.name, **forecast_features)
        normalized_score = normalize_probability_score(result["risk_score"])

        prediction = RiskPrediction(
            zone_id=str(zone.id),
            predicted_at=datetime.utcnow(),
            risk_score=normalized_score,
            risk_level=str(result["risk_label"]),
            model_version="rockefeller_model2_model3_v1",
            features_used=forecast_features,
            confidence=normalized_score,
        )
        await prediction.insert()
        written += 1

    return written
