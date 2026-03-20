from beanie import Document
from typing import Optional
from datetime import datetime
from enum import Enum

class CrackType(str, Enum):
    parallel = "parallel"
    perpendicular = "perpendicular"
    surface_fracture = "surface_fracture"
    tension_crack = "tension_crack"
    rockfall_sign = "rockfall_sign"
    water_seepage = "water_seepage"
    water_stream = "water_stream"
    soil_saturation = "soil_saturation"
    other = "other"

class CrackStatus(str, Enum):
    pending = "pending"
    ai_scored = "ai_scored"
    reviewed = "reviewed"
    closed = "closed"

class EngineerAction(str, Enum):
    confirmed_critical = "confirmed_critical"
    confirmed_safe = "confirmed_safe"
    false_alarm = "false_alarm"

class CrackReport(Document):
    zone_id: str
    zone_name: str
    reported_by: str
    photo_url: Optional[str] = None
    annotated_photo_url: Optional[str] = None   # ML fills later
    coords: Optional[dict] = None
    crack_type: CrackType = CrackType.other
    severity: str = "low"
    ai_severity_class: Optional[str] = None      # ML fills later
    ai_risk_score: Optional[float] = None        # ML fills later
    remarks: Optional[str] = None
    engineer_action: Optional[EngineerAction] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    zone_color_before: Optional[str] = None
    zone_color_after: Optional[str] = None
    status: CrackStatus = CrackStatus.pending
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "crack_reports"
