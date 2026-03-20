from beanie import Document
from typing import Optional
from datetime import datetime
from enum import Enum

class WarningLevel(str, Enum):
    none = "none"
    watch = "watch"
    warning = "warning"
    extreme = "extreme"

class WeatherRecord(Document):
    district: str
    recorded_at: datetime
    rainfall_mm: float = 0.0
    wind_speed_kmh: Optional[float] = None
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    warning_level: WarningLevel = WarningLevel.none
    trend: Optional[str] = None       # increasing/stable/decreasing
    source: Optional[str] = None

    class Settings:
        name = "weather_records"
