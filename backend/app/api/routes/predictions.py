from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.rule_engine import get_zone_features
from app.models.blast_event import BlastEvent
from app.models.risk_prediction import RiskPrediction
from app.models.user import User
from app.models.zone import Zone
from app.services.crack_ai import crack_model_status
from app.services.ml_models import get_district_forecast

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def _risk_value(level: str | None) -> int:
    order = {"green": 1, "yellow": 2, "orange": 3, "red": 4}
    return order.get(str(level or "").lower(), 0)


def _hazard_score(current_score: float, predicted_score: float) -> float:
    # Blend current and predicted risk with slight forward-looking emphasis.
    blended = (0.4 * float(current_score or 0)) + (0.6 * float(predicted_score or 0))
    return round(min(max(blended, 0.0), 1.0) * 100, 2)


def _factor_breakdown(features: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not features:
        return []

    candidates = [
        {
            "key": "rainfall_mm_24h",
            "label": "Rainfall 24h",
            "value": round(float(features.get("rainfall_mm_24h", 0) or 0), 2),
            "impact": round(float(features.get("rainfall_mm_24h", 0) or 0) * 0.4, 3),
        },
        {
            "key": "rainfall_mm_7d",
            "label": "Rainfall 7d",
            "value": round(float(features.get("rainfall_mm_7d", 0) or 0), 2),
            "impact": round(float(features.get("rainfall_mm_7d", 0) or 0) * 0.08, 3),
        },
        {
            "key": "blast_count_7d",
            "label": "Blast Count 7d",
            "value": int(features.get("blast_count_7d", 0) or 0),
            "impact": round(float(features.get("blast_count_7d", 0) or 0) * 6.0, 3),
        },
        {
            "key": "avg_blast_intensity",
            "label": "Blast Intensity",
            "value": round(float(features.get("avg_blast_intensity", 0) or 0), 2),
            "impact": round(float(features.get("avg_blast_intensity", 0) or 0) * 14.0, 3),
        },
        {
            "key": "avg_crack_score",
            "label": "Crack Score",
            "value": round(float(features.get("avg_crack_score", 0) or 0), 3),
            "impact": round(float(features.get("avg_crack_score", 0) or 0) * 100.0, 3),
        },
        {
            "key": "critical_crack_flag",
            "label": "Critical Crack Flag",
            "value": int(features.get("critical_crack_flag", 0) or 0),
            "impact": round(float(features.get("critical_crack_flag", 0) or 0) * 80.0, 3),
        },
    ]

    ranked = sorted(candidates, key=lambda x: x["impact"], reverse=True)
    return ranked[:4]


async def _build_zone_row(zone: Zone, latest_prediction: RiskPrediction | None) -> dict[str, Any]:
    forecast = get_district_forecast(zone.district, days_ahead=7)
    forecast_rows = forecast.get("forecast", []) if "error" not in forecast else []
    forecast_mm = [round(float(row.get("rainfall_mm", 0) or 0), 2) for row in forecast_rows]

    blast = await BlastEvent.find(BlastEvent.zone_id == str(zone.id)).sort("-created_at").first_or_none()
    features_used = latest_prediction.features_used if latest_prediction else None
    if not features_used:
        features_used = await get_zone_features(zone)

    predicted_score = (
        float(latest_prediction.risk_score)
        if latest_prediction and latest_prediction.risk_score is not None
        else float(zone.risk_score or 0)
    )
    predicted_level = (
        str(latest_prediction.risk_level)
        if latest_prediction and latest_prediction.risk_level
        else str(zone.risk_level)
    )

    return {
        "zone_id": str(zone.id),
        "zone_name": zone.name,
        "mine_name": zone.mine_name,
        "district": zone.district,
        "current_risk_level": str(zone.risk_level),
        "current_risk_score": round(float(zone.risk_score or 0), 4),
        "predicted_risk_level": predicted_level,
        "predicted_risk_score": round(predicted_score, 4),
        "hazard_score": _hazard_score(float(zone.risk_score or 0), predicted_score),
        "forecast_rainfall_7d_mm": forecast_mm,
        "latest_blast_anomaly": bool(blast.is_anomaly) if blast else False,
        "model1_available": crack_model_status().get("model1_loaded", False),
        "predicted_at": (
            latest_prediction.predicted_at.isoformat()
            if latest_prediction and latest_prediction.predicted_at
            else zone.last_updated.isoformat() if zone.last_updated else None
        ),
        "factor_breakdown": _factor_breakdown(features_used),
    }


def _latest_predictions_by_zone(predictions: list[RiskPrediction]) -> dict[str, RiskPrediction]:
    latest_by_zone: dict[str, RiskPrediction] = {}
    for prediction in predictions:
        if prediction.zone_id not in latest_by_zone:
            latest_by_zone[prediction.zone_id] = prediction
    return latest_by_zone


def _district_forecast_cache(zones: list[Zone]) -> dict[str, list[float]]:
    cache: dict[str, list[float]] = {}
    districts = sorted({z.district for z in zones if z.district})
    for district in districts:
        forecast = get_district_forecast(district, days_ahead=7)
        rows = forecast.get("forecast", []) if "error" not in forecast else []
        cache[district] = [round(float(row.get("rainfall_mm", 0) or 0), 2) for row in rows]
    return cache


def _latest_blast_by_zone(blasts: list[BlastEvent]) -> dict[str, BlastEvent]:
    latest: dict[str, BlastEvent] = {}
    for blast in blasts:
        if blast.zone_id not in latest:
            latest[blast.zone_id] = blast
    return latest


async def _build_zone_row_fast(
    zone: Zone,
    latest_prediction: RiskPrediction | None,
    forecast_mm: list[float],
    latest_blast: BlastEvent | None,
    model1_available: bool,
) -> dict[str, Any]:
    predicted_score = (
        float(latest_prediction.risk_score)
        if latest_prediction and latest_prediction.risk_score is not None
        else float(zone.risk_score or 0)
    )
    predicted_level = (
        str(latest_prediction.risk_level)
        if latest_prediction and latest_prediction.risk_level
        else str(zone.risk_level)
    )

    features_used = latest_prediction.features_used if latest_prediction else None

    return {
        "zone_id": str(zone.id),
        "zone_name": zone.name,
        "mine_name": zone.mine_name,
        "district": zone.district,
        "current_risk_level": str(zone.risk_level),
        "current_risk_score": round(float(zone.risk_score or 0), 4),
        "predicted_risk_level": predicted_level,
        "predicted_risk_score": round(predicted_score, 4),
        "hazard_score": _hazard_score(float(zone.risk_score or 0), predicted_score),
        "forecast_rainfall_7d_mm": forecast_mm,
        "latest_blast_anomaly": bool(latest_blast.is_anomaly) if latest_blast else False,
        "model1_available": model1_available,
        "predicted_at": (
            latest_prediction.predicted_at.isoformat()
            if latest_prediction and latest_prediction.predicted_at
            else zone.last_updated.isoformat() if zone.last_updated else None
        ),
        "factor_breakdown": _factor_breakdown(features_used),
    }


@router.get("/zones")
async def list_zone_predictions(current_user: User = Depends(get_current_user)):
    _ = current_user

    zones = await Zone.find().to_list()
    predictions = await RiskPrediction.find().sort("-predicted_at").to_list()
    blasts = await BlastEvent.find().sort("-created_at").to_list()

    latest_by_zone = _latest_predictions_by_zone(predictions)
    forecast_cache = _district_forecast_cache(zones)
    blast_by_zone = _latest_blast_by_zone(blasts)
    model1_available = crack_model_status().get("model1_loaded", False)

    rows = []
    for zone in zones:
        row = await _build_zone_row_fast(
            zone=zone,
            latest_prediction=latest_by_zone.get(str(zone.id)),
            forecast_mm=forecast_cache.get(zone.district, []),
            latest_blast=blast_by_zone.get(str(zone.id)),
            model1_available=model1_available,
        )
        rows.append(row)

    rows.sort(
        key=lambda r: (
            _risk_value(r.get("predicted_risk_level")),
            float(r.get("predicted_risk_score") or 0),
        ),
        reverse=True,
    )
    return {"total": len(rows), "zones": rows}


@router.get("/zones/{zone_id}")
async def get_zone_prediction(zone_id: str, current_user: User = Depends(get_current_user)):
    _ = current_user

    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    prediction = (
        await RiskPrediction.find(RiskPrediction.zone_id == str(zone.id))
        .sort("-predicted_at")
        .first_or_none()
    )

    row = await _build_zone_row(zone, prediction)
    return row


@router.get("/summary")
async def predictions_summary(current_user: User = Depends(get_current_user)):
    _ = current_user

    zones = await Zone.find().to_list()
    predictions = await RiskPrediction.find().sort("-predicted_at").to_list()

    latest_by_zone = _latest_predictions_by_zone(predictions)

    counts = {"green": 0, "yellow": 0, "orange": 0, "red": 0}
    hazard_total = 0.0
    predicted_today = 0
    today = datetime.utcnow().date()

    for zone in zones:
        prediction = latest_by_zone.get(str(zone.id))
        level = str(prediction.risk_level) if prediction and prediction.risk_level else str(zone.risk_level)
        score = float(prediction.risk_score) if prediction and prediction.risk_score is not None else float(zone.risk_score or 0)

        if level in counts:
            counts[level] += 1

        hazard_total += _hazard_score(float(zone.risk_score or 0), score)

        if prediction and prediction.predicted_at and prediction.predicted_at.date() == today:
            predicted_today += 1

    total_zones = len(zones)
    model1_available = crack_model_status().get("model1_loaded", False)

    return {
        "total_zones": total_zones,
        "predicted_today": predicted_today,
        "risk_distribution": counts,
        "avg_hazard_score": round(hazard_total / total_zones, 2) if total_zones else 0.0,
        "model1_available": model1_available,
        "critical_or_high": counts["red"] + counts["orange"],
    }
