"""
Run this ONCE after generate_data.py:
  cd backend
  python -m app.ml.model2_risk_predictor.train
"""
import pandas as pd
import numpy as np
import pickle, os
from xgboost import XGBClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

BASE = os.path.dirname(__file__)
DATA = os.path.join(BASE, "training_data.csv")

FEATURES = [
    "blast_count_7d", "avg_blast_intensity",
    "rainfall_mm_24h", "rainfall_mm_7d",
    "crack_count_7d", "avg_crack_score", "critical_crack_flag",
    "elevation_m", "area_sq_km", "days_since_inspection",
]

def train():
    df = pd.read_csv(DATA)
    print(f"Loaded {len(df)} rows. Label distribution:")
    print(df["risk_label"].value_counts())

    X = df[FEATURES].values
    y = df["risk_label"].values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc, test_size=0.2, random_state=42, stratify=y_enc
    )

    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
    )
    model.fit(X_train, y_train,
              eval_set=[(X_test, y_test)],
              verbose=False)

    y_pred = model.predict(X_test)
    print("\n--- Classification Report ---")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save model + scaler + label encoder
    with open(os.path.join(BASE, "model.pkl"),  "wb") as f: pickle.dump(model, f)
    with open(os.path.join(BASE, "scaler.pkl"), "wb") as f: pickle.dump(scaler, f)
    with open(os.path.join(BASE, "encoder.pkl"),"wb") as f: pickle.dump(le, f)

    print(f"\n✅ Model saved to {BASE}/model.pkl")
    print(f"   Feature importances:")
    for feat, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
        print(f"   {feat:<30} {imp:.4f}")

if __name__ == "__main__":
    train()
