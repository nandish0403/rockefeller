from fastapi import APIRouter, HTTPException, Depends
from datetime import timedelta
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.api.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ✅ Anyone can register (or lock this to admin-only if needed)
@router.post("/register", status_code=201)
async def register(body: RegisterRequest):
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        district=body.district,
        zone_assigned=body.zone_assigned,
    )
    await user.insert()
    return {"message": "User registered successfully", "email": user.email}

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = await User.find_one(User.email == body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "district": user.district,
            "zone_assigned": user.zone_assigned,
            "avatar_url": user.avatar_url,
        },
    }

# ✅ Any logged-in user can get their own profile
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "district": current_user.district,
        "zone_assigned": current_user.zone_assigned,
        "avatar_url": current_user.avatar_url,
    }

# 🔒 Admin only — list all users
@router.get("/users")
async def list_users(current_user: User = Depends(require_admin)):
    users = await User.find().to_list()
    return [
        {
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "district": u.district,
            "zone_assigned": u.zone_assigned,
        }
        for u in users
    ]

# 🔒 Admin only — change a user's role
@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: dict,
    current_user: User = Depends(require_admin),
):
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = body.get("role", user.role)
    await user.save()
    return {"message": "Role updated", "role": user.role}
