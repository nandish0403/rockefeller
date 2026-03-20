from beanie import Document
from typing import Optional
from datetime import datetime

class ExplorationLog(Document):
    zone_id: str
    zone_name: str
    logged_by: str
    start_time: datetime
    end_time: Optional[datetime] = None
    direction: Optional[str] = None
    depth_meters: Optional[float] = None
    equipment: Optional[str] = None
    active: bool = True
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "exploration_logs"
