from __future__ import annotations

from datetime import datetime

import numpy as np


def get_monsoon_flag() -> int:
    return 1 if datetime.now().month in [6, 7, 8, 9] else 0


def normalize_zone_features(f: dict) -> np.ndarray:
    return np.array([[
        min(f["rainfall_mm_24h"], 400) / 400,
        min(f["rainfall_mm_7d"], 2000) / 2000,
        min(f["blast_count_7d"], 18) / 18,
        min(f["avg_blast_intensity"], 10) / 10,
        min(f["crack_count_7d"], 12) / 12,
        float(f["avg_crack_score"]),
        float(f["critical_crack_flag"]),
        min(f["days_since_inspection"], 90) / 90,
        float(f["is_monsoon"]),
        min(f["elevation_m"], 1000) / 1000,
        min(f["area_sq_km"], 10) / 10,
    ]])


def normalize_probability_score(value: float | int | None) -> float:
    """
    Normalize mixed-scale risk/confidence values into 0-1.

    Supports:
    - probability scale: 0..1
    - legacy percent scale: 0..100
    - double-percent legacy scale: 0..10000
    """
    if value is None:
        return 0.0

    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not np.isfinite(score):
        return 0.0

    if score <= 0:
        return 0.0
    if score <= 1:
        return round(score, 4)
    if score <= 100:
        return round(score / 100.0, 4)
    if score <= 10000:
        return round(score / 10000.0, 4)
    return 1.0
