from pydantic import BaseModel
from typing import Optional

class CreateAlertRequest(BaseModel):
    zone_id: str
    zone_name: str
    district: str
    risk_level: str
    trigger_reason: str
    trigger_source: str = "manual"
    recommended_action: Optional[str] = None

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
    resolved_by: Optional[str]
    created_at: Optional[str]
