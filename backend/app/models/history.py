from beanie import Document
from typing import Optional
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    landslide = "landslide"
    rockfall = "rockfall"
    both = "both"
    blast = "blast"

class DamageLevel(str, Enum):
    none = "none"
    minor = "minor"
    moderate = "moderate"
    severe = "severe"
    catastrophic = "catastrophic"

class HistoricalLandslide(Document):
    zone_id: str
    date: str
    type: EventType
    magnitude: Optional[float] = None
    damage_level: DamageLevel = DamageLevel.none
    notes: Optional[str] = None
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "historical_landslides"
