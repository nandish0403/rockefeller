from beanie import Document
from typing import Optional
from datetime import datetime
from enum import Enum

class ReportSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class ReviewStatus(str, Enum):
    pending = "pending"
    reviewed = "reviewed"
    false_alarm = "false_alarm"
    critical = "critical"

class Report(Document):
    zone_id: str
    zone_name: str
    reported_by: str
    photo_url: Optional[str] = None
    coords: Optional[dict] = None        # {"lat": float, "lng": float}
    severity: ReportSeverity = ReportSeverity.low
    remarks: Optional[str] = None
    review_status: ReviewStatus = ReviewStatus.pending
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "reports"
