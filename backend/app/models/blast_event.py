from beanie import Document
from typing import Optional
from datetime import datetime

class BlastEvent(Document):
    zone_id: str
    zone_name: str
    logged_by: str
    blast_date: datetime
    intensity: Optional[float] = None
    depth_meters: Optional[float] = None
    explosive_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "blast_events"
