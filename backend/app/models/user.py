from beanie import Document
from pydantic import EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    safety_officer = "safety_officer"
    field_worker = "field_worker"

class User(Document):
    name: str
    email: EmailStr
    password_hash: str
    role: UserRole = UserRole.field_worker
    zone_assigned: Optional[str] = None
    district: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = datetime.utcnow()
    last_login: Optional[datetime] = None

    class Settings:
        name = "users"
