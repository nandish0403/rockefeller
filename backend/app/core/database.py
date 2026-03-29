from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

from app.models.user import User
from app.models.zone import Zone
from app.models.alert import Alert
from app.models.report import Report
from app.models.crack_report import CrackReport
from app.models.blast_event import BlastEvent
from app.models.exploration import ExplorationLog
from app.models.weather_record import WeatherRecord
from app.models.history import HistoricalLandslide
from app.models.risk_prediction import RiskPrediction
from app.models.user_location import UserLocation
from app.models.worker_presence import WorkerPresence
from app.models.notification import Notification
from app.models.push_subscription import PushSubscription

client = None

async def init_db():
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.get_database(settings.DATABASE_NAME)
    await init_beanie(
        database=db,
        document_models=[
            User, Zone, Alert, Report, CrackReport,
            BlastEvent, ExplorationLog, WeatherRecord,
            HistoricalLandslide, RiskPrediction, UserLocation,
            WorkerPresence,
            Notification, PushSubscription,
        ]
    )

async def close_db():
    if client:
        client.close()
