from beanie import Document
from pydantic import EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin          = "admin"
    safety_officer = "safety_officer"
    field_worker   = "field_worker"

class User(Document):
    name:          str
    email:         EmailStr
    password_hash: str
    role:          UserRole    = UserRole.field_worker
    district:      Optional[str] = None
    zone_assigned: Optional[str] = None
    worker_id:     Optional[str] = None   # ← NEW
    phone:         Optional[str] = None   # ← NEW
    avatar_url:    Optional[str] = None
    created_at:    datetime     = datetime.utcnow()
    last_login:    Optional[datetime] = None

    class Settings:
        name = "users"
