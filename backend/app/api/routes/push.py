from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.push_service import is_push_configured, save_subscription


router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/vapid-public-key")
async def get_vapid_public_key(current_user: User = Depends(get_current_user)):
    if not settings.VAPID_PUBLIC_KEY:
        return {"public_key": None}
    return {"public_key": settings.VAPID_PUBLIC_KEY}


@router.post("/subscribe")
async def subscribe_push(body: dict, current_user: User = Depends(get_current_user)):
    subscription = body.get("subscription")
    if not subscription or "endpoint" not in subscription:
        raise HTTPException(status_code=400, detail="Invalid subscription payload")

    await save_subscription(str(current_user.id), subscription)
    return {"ok": True, "push_enabled": is_push_configured()}
