import pickle, os
import numpy as np

BASE = os.path.dirname(__file__)

# Load once at import time — stays in memory
_model   = None
_scaler  = None
_encoder = None

def _load():
    global _model, _scaler, _encoder
    if _model is None:
        with open(os.path.join(BASE, "model.pkl"),  "rb") as f: _model   = pickle.load(f)
        with open(os.path.join(BASE, "scaler.pkl"), "rb") as f: _scaler  = pickle.load(f)
        with open(os.path.join(BASE, "encoder.pkl"),"rb") as f: _encoder = pickle.load(f)

def predict(
    blast_count_7d: int       = 0,
    avg_blast_intensity: float = 0.0,
    rainfall_mm_24h: float     = 0.0,
    rainfall_mm_7d: float      = 0.0,
    crack_count_7d: int        = 0,
    avg_crack_score: float     = 0.0,
    critical_crack_flag: int   = 0,
    elevation_m: float         = 300.0,
    area_sq_km: float          = 100.0,
    days_since_inspection: int = 30,
) -> tuple[str, float]:
    """
    Returns (risk_level, risk_score).
    risk_level: "green" | "yellow" | "orange" | "red"
    risk_score: float 0.0 → 1.0
    """
    _load()

    features = np.array([[
        blast_count_7d, avg_blast_intensity,
        rainfall_mm_24h, rainfall_mm_7d,
        crack_count_7d, avg_crack_score, critical_crack_flag,
        elevation_m, area_sq_km, days_since_inspection,
    ]])

    scaled     = _scaler.transform(features)
    class_idx  = _model.predict(scaled)[0]
    proba      = _model.predict_proba(scaled)[0]
    risk_level = _encoder.inverse_transform([class_idx])[0]
    risk_score = float(np.max(proba))

    return risk_level, risk_score
