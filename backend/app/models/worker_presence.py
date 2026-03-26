from beanie import Document
from datetime import datetime
from typing import Optional


class WorkerPresence(Document):
    user_id: str
    user_name: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    status: str = "outside"  # inside | outside
    last_check_in_at: Optional[datetime] = None
    last_check_out_at: Optional[datetime] = None
    updated_at: datetime = datetime.utcnow()
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "worker_presence"
