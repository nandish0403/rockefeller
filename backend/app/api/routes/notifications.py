from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.api.dependencies import get_current_user, require_admin
from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.notification_service import notification_to_dict, notify_users_with_optional_email


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class AdminNotifyRequest(BaseModel):
    title: str = Field(min_length=3, max_length=140)
    message: str = Field(min_length=5, max_length=5000)
    audience: Literal["all", "selected"] = "all"
    user_ids: list[str] = []
    zone_name: str | None = None
    send_email: bool = False
    cc_emails: list[EmailStr] = []
    notification_type: NotificationType = NotificationType.warning


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


@router.post("/admin/broadcast")
async def admin_broadcast_notification(
    body: AdminNotifyRequest,
    current_user: User = Depends(require_admin),
):
    _ = current_user

    users: list[User]
    if body.audience == "all":
        users = await User.find(User.role != "admin").to_list()
    else:
        requested = {str(u).strip() for u in body.user_ids if str(u).strip()}
        if not requested:
            raise HTTPException(status_code=400, detail="Select at least one user")
        users = await User.find(User.id.in_(list(requested))).to_list()

    if not users:
        raise HTTPException(status_code=404, detail="No target users found")

    result = await notify_users_with_optional_email(
        users,
        title=body.title,
        message=body.message,
        zone_name=body.zone_name,
        notif_type=body.notification_type,
        send_email=body.send_email,
        cc_emails=[str(e) for e in body.cc_emails],
    )

    return {
        "status": "ok",
        "audience": body.audience,
        "users_targeted": len(users),
        **result,
    }
