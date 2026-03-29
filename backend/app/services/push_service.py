import json
from typing import Iterable, List
from datetime import datetime

from app.core.config import settings
from app.models.push_subscription import PushSubscription

try:
    from pywebpush import WebPushException, webpush
except Exception:  # pragma: no cover - optional dependency at runtime
    WebPushException = Exception
    webpush = None


def is_push_configured() -> bool:
    return bool(settings.VAPID_PRIVATE_KEY and settings.VAPID_PUBLIC_KEY and settings.VAPID_CLAIMS_SUBJECT)


async def save_subscription(user_id: str, subscription: dict) -> PushSubscription:
    existing = await PushSubscription.find_one(PushSubscription.user_id == user_id)
    if existing:
        existing.subscription = subscription
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return existing

    record = PushSubscription(user_id=user_id, subscription=subscription)
    await record.insert()
    return record


async def send_push_to_users(user_ids: Iterable[str], payload: dict) -> None:
    if not is_push_configured() or webpush is None:
        return

    records = await PushSubscription.find(PushSubscription.user_id.in_(list(user_ids))).to_list()
    for record in records:
        try:
            webpush(
                subscription_info=record.subscription,
                data=json.dumps(payload),
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CLAIMS_SUBJECT},
            )
        except WebPushException:
            # Remove invalid subscriptions to avoid repeated failures.
            await record.delete()
