from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "rockefeller"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REDIS_URL: str = "redis://localhost:6379"
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    RAINFALL_YELLOW_THRESHOLD_MM: float = 150
    RAINFALL_ORANGE_THRESHOLD_MM: float = 250
    RAINFALL_RED_THRESHOLD_MM: float = 350
    BLAST_YELLOW_THRESHOLD: int = 5
    BLAST_ORANGE_THRESHOLD: int = 10
    CRACK_RISK_FLAG_THRESHOLD: float = 0.4
    CRACK_RISK_CRITICAL_THRESHOLD: float = 0.7
    WATER_REPORT_YELLOW_THRESHOLD: int = 2
    ZONE_PROXIMITY_ALERT_METERS: int = 200

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
