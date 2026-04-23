from pydantic_settings import BaseSettings
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_ROOT / ".env"

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "rockefeller"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379"
    CORS_ORIGINS: str = "http://localhost:5173,https://rockefeller-production.up.railway.app"
    CORS_ORIGIN_REGEX: str = r"^https://([a-z0-9-]+\.)?vercel\.app$"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    RAINFALL_YELLOW_THRESHOLD_MM: float = 150
    RAINFALL_ORANGE_THRESHOLD_MM: float = 250
    RAINFALL_RED_THRESHOLD_MM: float = 350
    BLAST_YELLOW_THRESHOLD: int = 5
    BLAST_ORANGE_THRESHOLD: int = 10
    BLAST_REEVAL_THRESHOLD: int = 5
    DGMS_PPV_LIMIT_MM_S: float = 10.0
    CRACK_RISK_FLAG_THRESHOLD: float = 0.4
    CRACK_RISK_CRITICAL_THRESHOLD: float = 0.7
    WATER_REPORT_YELLOW_THRESHOLD: int = 2
    ZONE_PROXIMITY_ALERT_METERS: int = 200
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIMS_SUBJECT: str = "mailto:admin@rockefeller.local"
    MODEL_ARTIFACTS_DIR: str = ""
    CRACK_MODEL_PATH: str = ""
    CRACK_MODEL_URL: str = ""
    MODEL_CACHE_DIR: str = "runtime_models"
    MODEL_DOWNLOAD_TIMEOUT_SEC: int = 300
    DAILY_REFRESH_TIMEZONE: str = "Asia/Kolkata"
    DAILY_REFRESH_HOUR: int = 6
    DAILY_REFRESH_MINUTE: int = 0
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    EMAIL_FROM: str = ""

    class Config:
        env_file = str(ENV_FILE_PATH)
        extra = "ignore"

settings = Settings()

if not Path(settings.UPLOAD_DIR).is_absolute():
    settings.UPLOAD_DIR = str((BACKEND_ROOT / settings.UPLOAD_DIR).resolve())
