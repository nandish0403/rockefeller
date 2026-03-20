from beanie import Document
from typing import Optional
from datetime import datetime

class RiskPrediction(Document):
    zone_id: str
    predicted_at: datetime = datetime.utcnow()
    risk_score: float
    risk_level: str
    model_version: str = "rule_engine_v1"
    features_used: Optional[dict] = None
    confidence: Optional[float] = None

    class Settings:
        name = "risk_predictions"
