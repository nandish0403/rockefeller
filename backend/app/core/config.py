from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "rockefeller"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379"
    CORS_ORIGINS: str = "http://localhost:5173,https://rockefeller-production.up.railway.app"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.1-pro-preview"
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
    MODEL_DOWNLOAD_TIMEOUT_SEC: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
