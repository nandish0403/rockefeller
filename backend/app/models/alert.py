from beanie import Document
from typing import Optional
from datetime import datetime
from enum import Enum

class AlertStatus(str, Enum):
    active = "active"
    acknowledged = "acknowledged"
    resolved = "resolved"

class TriggerSource(str, Enum):
    ml_model = "ml_model"
    crack_confirmed = "crack_confirmed"
    rainfall_threshold = "rainfall_threshold"
    blast_threshold = "blast_threshold"
    manual = "manual"
    rule_engine = "rule_engine"

class Alert(Document):
    zone_id: str
    zone_name: str
    district: str
    risk_level: str
    trigger_reason: str
    trigger_source: TriggerSource = TriggerSource.rule_engine
    recommended_action: Optional[str] = None
    status: AlertStatus = AlertStatus.active
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "alerts"
