from beanie import Document
from typing import Optional
from datetime import datetime

class BlastEvent(Document):
    zone_id: str
    zone_name: str
    logged_by: str
    blast_date: datetime
    intensity: Optional[float] = None
    ppv_reading: Optional[float] = None
    depth_meters: Optional[float] = None
    blasts_this_week: Optional[int] = None
    dgms_ppv_limit: Optional[float] = None
    is_ppv_exceedance: Optional[bool] = None
    is_anomaly: Optional[bool] = None
    anomaly_score: Optional[float] = None
    anomaly_severity: Optional[str] = None
    explosive_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "blast_events"
