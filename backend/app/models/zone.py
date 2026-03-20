from beanie import Document
from typing import Optional, List
from datetime import datetime
from enum import Enum

class RiskLevel(str, Enum):
    green = "green"
    yellow = "yellow"
    orange = "orange"
    red = "red"

class ZoneStatus(str, Enum):
    monitoring = "monitoring"
    warning = "warning"
    critical = "critical"

class Zone(Document):
    name: str
    mine_name: str
    district: str
    risk_level: RiskLevel = RiskLevel.green
    risk_score: float = 0.0
    latlngs: List[List[float]] = []   # [[lat,lng], ...] for React Leaflet
    soil_type: Optional[str] = None
    slope_angle: Optional[float] = None
    status: ZoneStatus = ZoneStatus.monitoring
    last_landslide: Optional[str] = None
    blast_count_7d: int = 0
    recent_rainfall: Optional[float] = None
    last_updated: datetime = datetime.utcnow()
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "zones"
