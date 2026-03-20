from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ZoneResponse(BaseModel):
    id: str
    name: str
    mine_name: str
    district: str
    risk_level: str
    risk_score: float
    latlngs: List[List[float]]
    soil_type: Optional[str]
    slope_angle: Optional[float]
    status: str
    last_landslide: Optional[str]
    blast_count_7d: int
    recent_rainfall: Optional[float]
    last_updated: Optional[datetime]

class ZoneUpdateRequest(BaseModel):
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    status: Optional[str] = None
    blast_count_7d: Optional[int] = None
    recent_rainfall: Optional[float] = None
