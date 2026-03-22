"""
Run this ONCE to generate training data:
  cd backend
  python -m app.ml.model2_risk_predictor.generate_data
"""
import pandas as pd
import numpy as np
import os

np.random.seed(42)
N = 1000

def label(score):
    if score >= 0.75: return "red"
    if score >= 0.50: return "orange"
    if score >= 0.25: return "yellow"
    return "green"

rows = []
for _ in range(N):
    blast_count      = np.random.randint(0, 20)
    avg_intensity    = np.random.uniform(1, 10) if blast_count > 0 else 0
    rainfall_24h     = np.random.exponential(30)
    rainfall_7d      = rainfall_24h * np.random.uniform(3, 10)
    crack_count      = np.random.randint(0, 15)
    avg_crack_score  = np.random.uniform(0, 1) if crack_count > 0 else 0
    critical_crack   = 1 if avg_crack_score > 0.7 else 0
    elevation_m      = np.random.uniform(200, 800)
    area_sq_km       = np.random.uniform(10, 500)
    days_since_insp  = np.random.randint(0, 90)

    # Compute realistic risk score based on domain knowledge
    risk = (
        (blast_count / 20)        * 0.25 +
        (avg_intensity / 10)      * 0.10 +
        (rainfall_24h / 400)      * 0.25 +
        (crack_count / 15)        * 0.15 +
        (avg_crack_score)         * 0.15 +
        (critical_crack)          * 0.05 +
        (days_since_insp / 90)    * 0.05
    )
    risk = float(np.clip(risk + np.random.normal(0, 0.03), 0, 1))

    rows.append({
        "blast_count_7d":    blast_count,
        "avg_blast_intensity": round(avg_intensity, 2),
        "rainfall_mm_24h":   round(rainfall_24h, 2),
        "rainfall_mm_7d":    round(rainfall_7d, 2),
        "crack_count_7d":    crack_count,
        "avg_crack_score":   round(avg_crack_score, 3),
        "critical_crack_flag": critical_crack,
        "elevation_m":       round(elevation_m, 1),
        "area_sq_km":        round(area_sq_km, 1),
        "days_since_inspection": days_since_insp,
        "risk_score":        round(risk, 4),
        "risk_label":        label(risk),
    })

out_dir = os.path.dirname(__file__)
out_path = os.path.join(out_dir, "training_data.csv")
df = pd.DataFrame(rows)
df.to_csv(out_path, index=False)
print(f"✅ Generated {N} rows → {out_path}")
print(df["risk_label"].value_counts())
