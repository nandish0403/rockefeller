from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any
from datetime import datetime, timedelta

import numpy as np
from app.core.config import settings
from app.models.blast_event import BlastEvent

FEATURES = [
    "blast_count_7d",
    "avg_blast_intensity",
    "rainfall_mm_24h",
    "rainfall_mm_7d",
    "crack_count_7d",
    "avg_crack_score",
    "critical_crack_flag",
    "elevation_m",
    "area_sq_km",
    "days_since_inspection",
    "is_monsoon",
]

_MODEL2_RED_THRESHOLD = 0.72
_MODEL2_ORANGE_THRESHOLD = 0.48
_MODEL2_YELLOW_THRESHOLD = 0.24
_MODEL4_CRITICAL_THRESHOLD = -0.15

_models: dict[str, Any] = {}


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _resolve_config_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path

    backend_root = _backend_root()
    backend_candidate = backend_root / path
    workspace_candidate = backend_root.parent / path

    if backend_candidate.exists():
        return backend_candidate
    if workspace_candidate.exists():
        return workspace_candidate
    return backend_candidate


def _dataset_base() -> Path:
    configured = str(settings.MODEL_ARTIFACTS_DIR or "").strip()
    if configured:
        configured_path = _resolve_config_path(configured)
        if configured_path.exists():
            return configured_path
        return configured_path

    backend_root = _backend_root()
    workspace_root = backend_root.parent

    candidates = [
        backend_root / "dataset",
        workspace_root / "dataset",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    # Fallback to backend-local path so startup logs a clear file-not-found error.
    return backend_root / "dataset"


def _model3_dir() -> Path:
    base = _dataset_base()
    candidates = [
        base / "model3_district_models",
        base / "model 3 district models",
        base / "model 3 distict models",
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    # Keep backward-compatible default path so missing-folder errors remain clear.
    return candidates[0]


def available_district_models() -> list[str]:
    model_dir = _model3_dir()
    if not model_dir.exists():
        return []

    names: list[str] = []
    for path in model_dir.glob("*.pkl"):
        stem = path.stem.replace("_", " ").strip()
        if stem:
            names.append(stem)

    return sorted(set(names))


def district_model_count() -> int:
    return len(available_district_models())


def preload_models() -> None:
    base = _dataset_base()

    if "m2" not in _models:
        with open(base / "model2_model.pkl", "rb") as f:
            _models["m2"] = pickle.load(f)
        with open(base / "model2_scaler.pkl", "rb") as f:
            _models["m2_scaler"] = pickle.load(f)
        with open(base / "model2_encoder.pkl", "rb") as f:
            _models["m2_encoder"] = pickle.load(f)

    if "m4" not in _models:
        with open(base / "model4_blast_anomaly.pkl", "rb") as f:
            _models["m4"] = pickle.load(f)


def model_status() -> dict[str, bool]:
    return {
        "model2_loaded": "m2" in _models,
        "model4_loaded": "m4" in _models,
    }


def _score_to_label(score: float) -> str:
    if score >= _MODEL2_RED_THRESHOLD:
        return "red"
    if score >= _MODEL2_ORANGE_THRESHOLD:
        return "orange"
    if score >= _MODEL2_YELLOW_THRESHOLD:
        return "yellow"
    return "green"


async def _get_live_blast_features(zone_id: str) -> tuple[int, float]:
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent = await BlastEvent.find(
        BlastEvent.zone_id == str(zone_id),
        BlastEvent.blast_date >= cutoff,
    ).to_list()

    blast_count = len(recent)
    avg_intensity = (
        sum(float(row.intensity or 0) for row in recent) / blast_count
        if blast_count else 0.0
    )
    return blast_count, round(avg_intensity, 2)


async def predict_zone_risk(
    blast_count_7d: int,
    avg_blast_intensity: float,
    rainfall_mm_24h: float,
    rainfall_mm_7d: float,
    crack_count_7d: int,
    avg_crack_score: float,
    critical_crack_flag: int,
    elevation_m: float,
    area_sq_km: float,
    days_since_inspection: int,
    is_monsoon: int,
    zone_id: str | None = None,
) -> dict[str, float | str]:
    if "m2" not in _models:
        preload_models()

    if zone_id:
        live_count, live_avg = await _get_live_blast_features(zone_id)
        blast_count_7d = live_count
        avg_blast_intensity = live_avg

    features = np.array(
        [[
            blast_count_7d,
            avg_blast_intensity,
            rainfall_mm_24h,
            rainfall_mm_7d,
            crack_count_7d,
            avg_crack_score,
            critical_crack_flag,
            elevation_m,
            area_sq_km,
            days_since_inspection,
            is_monsoon,
        ]]
    )

    scaled = _models["m2_scaler"].transform(features)
    proba = _models["m2"].predict_proba(scaled)[0]
    risk_score = float(np.max(proba))
    risk_label = _score_to_label(risk_score)

    return {
        "risk_label": risk_label,
        "risk_score": round(risk_score, 4),
    }


def _district_filename(district: str) -> str:
    return f"{district.lower().replace(' ', '_')}.pkl"


def get_district_forecast(district: str, days_ahead: int = 7) -> dict[str, Any]:
    model_file = _model3_dir() / _district_filename(district)
    if not model_file.exists():
        return {"error": f"No model for district: {district}"}

    with open(model_file, "rb") as f:
        model = pickle.load(f)

    future = model.make_future_dataframe(periods=days_ahead)
    forecast = model.predict(future)
    rows = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(days_ahead)

    return {
        "district": district,
        "forecast": [
            {
                "date": str(row.ds.date()),
                "rainfall_mm": round(max(0.0, float(row.yhat)), 2),
                "lower": round(max(0.0, float(row.yhat_lower)), 2),
                "upper": round(max(0.0, float(row.yhat_upper)), 2),
            }
            for row in rows.itertuples()
        ],
    }


def get_tomorrow_rainfall(district: str) -> float:
    prediction = get_district_forecast(district=district, days_ahead=1)
    if "error" in prediction:
        return 0.0
    return float(prediction["forecast"][0]["rainfall_mm"])


def predict_blast_anomaly(intensity: float, depth_m: float, blasts_per_week: float) -> dict[str, Any]:
    if "m4" not in _models:
        preload_models()

    features = np.array([[intensity, depth_m, blasts_per_week]])
    score = float(_models["m4"].decision_function(features)[0])
    pred = int(_models["m4"].predict(features)[0])

    if score < _MODEL4_CRITICAL_THRESHOLD:
        severity = "critical"
    elif score < 0:
        severity = "warning"
    else:
        severity = "normal"

    return {
        "is_anomaly": pred == -1,
        "anomaly_score": round(score, 4),
        "severity": severity,
    }


def check_blast_anomaly(intensity: float, depth_m: float, blasts_per_week: float) -> dict[str, Any]:
    return predict_blast_anomaly(intensity=intensity, depth_m=depth_m, blasts_per_week=blasts_per_week)
