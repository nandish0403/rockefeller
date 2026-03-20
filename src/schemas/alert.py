from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertResponse(BaseModel):
    id: str
    zone_id: str
    zone_name: str
    district: str
    risk_level: str
    trigger_reason: str
    trigger_source: str
    recommended_action: Optional[str]
    status: str
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[datetime]
    resolved_by: Optional[str]
    resolved_at: Optional[datetime]
    created_at: Optional[datetime]

class CreateAlertRequest(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    risk_level: str
    trigger_reason: str
    trigger_source: Optional[str] = "manual"
    recommended_action: Optional[str] = None
