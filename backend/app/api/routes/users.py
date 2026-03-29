from fastapi import APIRouter, HTTPException, Depends
from beanie import PydanticObjectId
from datetime import datetime

from app.api.dependencies import require_admin
from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import RegisterRequest, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])


def _user_to_dict(u: User) -> dict:
    return {
        "id":           str(u.id),
        "name":         u.name,
        "email":        u.email,
        "role":         u.role,
        "district":     u.district,
        "zone_assigned":u.zone_assigned,
        "worker_id":    u.worker_id,
        "phone":        u.phone,
        "avatar_url":   u.avatar_url,
        "last_login":   u.last_login.isoformat() if u.last_login else None,
        "created_at":   u.created_at.isoformat() if u.created_at else None,
    }


# 🔒 Admin only — list all users
@router.get("")
async def list_users(current_user: User = Depends(require_admin)):
    users = await User.find().to_list()
    return [_user_to_dict(u) for u in users]


# 🔒 Admin only — create a new user
@router.post("", status_code=201)
async def create_user(body: RegisterRequest, current_user: User = Depends(require_admin)):
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name          = body.name,
        email         = body.email,
        password_hash = hash_password(body.password),
        role          = body.role,
        district      = body.district,
        zone_assigned = body.zone_assigned,
        worker_id     = body.worker_id,
        phone         = body.phone,
        created_at    = datetime.utcnow(),
    )
    await user.insert()
    return _user_to_dict(user)


# 🔒 Admin only — update a user's profile / role
@router.patch("/{user_id}")
async def update_user(
    user_id: str,
    body: UserUpdateRequest,
    current_user: User = Depends(require_admin),
):
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_none=True)
    password = update_data.pop("password", None)

    for key, value in update_data.items():
        setattr(user, key, value)

    if password:
        user.password_hash = hash_password(password)

    await user.save()
    return _user_to_dict(user)


# 🔒 Admin only — delete a user
@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_admin),
):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    try:
        user = await User.get(PydanticObjectId(user_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id")
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await user.delete()
