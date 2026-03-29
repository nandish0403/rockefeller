from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.api.dependencies import get_current_user
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_service import notification_to_dict


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(current_user: User = Depends(get_current_user)):
    rows = await Notification.find(Notification.user_id == str(current_user.id)).to_list()
    rows.sort(key=lambda n: n.created_at or datetime.min, reverse=True)
    return [notification_to_dict(n) for n in rows]


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    notification = await Notification.get(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    notification.is_read = True
    await notification.save()
    return notification_to_dict(notification)


@router.patch("/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    rows = await Notification.find(
        Notification.user_id == str(current_user.id),
        Notification.is_read == False,
    ).to_list()
    for row in rows:
        row.is_read = True
        await row.save()

    return {"updated": len(rows)}
