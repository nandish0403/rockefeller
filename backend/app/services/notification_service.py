import asyncio
import smtplib
from email.message import EmailMessage
from typing import Iterable, List, Optional

from app.core.config import settings
from app.models.notification import Notification, NotificationType
from app.models.user import User
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


def _smtp_ready() -> bool:
    return bool(
        settings.SMTP_HOST
        and settings.SMTP_PORT
        and settings.SMTP_USERNAME
        and settings.SMTP_PASSWORD
        and settings.EMAIL_FROM
    )


def _send_email_sync(recipients: list[str], subject: str, body: str) -> int:
    if not recipients or not _smtp_ready():
        return 0

    message = EmailMessage()
    message["From"] = settings.EMAIL_FROM
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT), timeout=30) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)

    return len(recipients)


async def send_email_to_recipients(recipients: list[str], subject: str, body: str) -> int:
    return await asyncio.to_thread(_send_email_sync, recipients, subject, body)


async def notify_users_with_optional_email(
    users: list[User],
    *,
    title: str,
    message: str,
    zone_name: Optional[str] = None,
    notif_type: NotificationType = NotificationType.warning,
    send_email: bool = False,
    cc_emails: Optional[list[str]] = None,
) -> dict:
    user_ids = [str(u.id) for u in users]
    created = await create_notifications_for_users(
        user_ids,
        title=title,
        message=message,
        zone_name=zone_name,
        notif_type=notif_type,
        send_push=True,
    )

    emailed = 0
    failed_email = 0
    if send_email:
        recipients = [str(u.email) for u in users if getattr(u, "email", None)]
        if cc_emails:
            recipients.extend([e for e in cc_emails if e])

        deduped = sorted(set(recipients))
        if deduped:
            try:
                emailed = await send_email_to_recipients(deduped, title, message)
            except Exception:
                failed_email = len(deduped)

    return {
        "notified": len(created),
        "emailed": emailed,
        "failed_email": failed_email,
        "smtp_configured": _smtp_ready(),
    }
