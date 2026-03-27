from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    admin          = "admin"
    safety_officer = "safety_officer"
    field_worker   = "field_worker"

class RegisterRequest(BaseModel):
    name:          str
    email:         EmailStr
    password:      str
    role:          UserRole    = UserRole.field_worker
    district:      Optional[str] = None
    zone_assigned: Optional[str] = None
    worker_id:     Optional[str] = None
    phone:         Optional[str] = None

class UserUpdateRequest(BaseModel):
    """Admin-only update schema. Email changes are excluded to prevent account takeover."""
    name:          Optional[str]      = None
    role:          Optional[UserRole] = None
    district:      Optional[str]      = None
    zone_assigned: Optional[str]      = None
    worker_id:     Optional[str]      = None
    phone:         Optional[str]      = None
    password:      Optional[str]      = None

class LoginRequest(BaseModel):
    email:    EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type:   str
    user:         dict
