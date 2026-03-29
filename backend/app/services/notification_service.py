from typing import Iterable, List, Optional

from app.models.notification import Notification, NotificationType
from app.services.push_service import send_push_to_users
from app.websocket.manager import ws_manager


def notification_to_dict(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "user_id": n.user_id,
        "title": n.title,
        "message": n.message,
        "zone_id": n.zone_id,
        "zone_name": n.zone_name,
        "type": n.type,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


async def create_notifications_for_users(
    user_ids: Iterable[str],
    *,
    title: str,
    message: str,
    zone_id: Optional[str] = None,
    zone_name: Optional[str] = None,
    notif_type: NotificationType = NotificationType.info,
    send_push: bool = False,
) -> List[Notification]:
    created: List[Notification] = []

    for user_id in user_ids:
        n = Notification(
            user_id=user_id,
            title=title,
            message=message,
            zone_id=zone_id,
            zone_name=zone_name,
            type=notif_type,
            is_read=False,
        )
        await n.insert()
        created.append(n)

        await ws_manager.send_to_user(
            user_id,
            {
                "event": "notification",
                "notification": notification_to_dict(n),
            },
        )

    if send_push and created:
        await send_push_to_users(
            [n.user_id for n in created],
            {
                "title": title,
                "message": message,
                "zone_id": zone_id,
                "zone_name": zone_name,
                "type": notif_type,
            },
        )

    return created
