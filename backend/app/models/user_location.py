from beanie import Document
from datetime import datetime

class UserLocation(Document):
    user_id: str
    lat: float
    lng: float
    recorded_at: datetime = datetime.utcnow()

    class Settings:
        name = "user_locations"
