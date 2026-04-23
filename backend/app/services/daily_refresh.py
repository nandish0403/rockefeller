import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings
from app.ml.collectors.imd_collector import run as imd_run
from app.services.forecast_runner import run_daily_risk_forecast


logger = logging.getLogger(__name__)


def _safe_time(hour: int, minute: int) -> tuple[int, int]:
    safe_hour = max(0, min(int(hour), 23))
    safe_minute = max(0, min(int(minute), 59))
    return safe_hour, safe_minute


def _refresh_timezone() -> ZoneInfo:
    tz_name = str(settings.DAILY_REFRESH_TIMEZONE or "Asia/Kolkata").strip() or "Asia/Kolkata"
    try:
        return ZoneInfo(tz_name)
    except ZoneInfoNotFoundError:
        logger.warning("Invalid DAILY_REFRESH_TIMEZONE '%s'. Falling back to UTC.", tz_name)
        return ZoneInfo("UTC")


def _seconds_until_next_run(now: datetime, hour: int, minute: int) -> float:
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return max((target - now).total_seconds(), 1.0)


async def run_refresh_pipeline(trigger: str = "manual") -> dict[str, int | str]:
    weather_records = 0
    predictions_written = 0

    try:
        weather_records = int(await imd_run())
    except Exception:
        logger.exception("Daily refresh: rainfall collector failed.")

    try:
        predictions_written = int(await run_daily_risk_forecast())
    except Exception:
        logger.exception("Daily refresh: risk forecast generation failed.")

    result = {
        "trigger": trigger,
        "weather_records": weather_records,
        "predictions_written": predictions_written,
    }
    logger.info("Daily refresh completed: %s", result)
    return result


async def run_scheduled_refresh_loop(stop_event: asyncio.Event) -> None:
    tz = _refresh_timezone()
    hour, minute = _safe_time(settings.DAILY_REFRESH_HOUR, settings.DAILY_REFRESH_MINUTE)

    while not stop_event.is_set():
        now = datetime.now(tz)
        wait_seconds = _seconds_until_next_run(now, hour=hour, minute=minute)
        next_run = now + timedelta(seconds=wait_seconds)

        logger.info(
            "Daily refresh scheduler armed for %s (%s)",
            next_run.isoformat(),
            getattr(tz, "key", str(tz)),
        )

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=wait_seconds)
            break
        except asyncio.TimeoutError:
            pass

        await run_refresh_pipeline(trigger="scheduled")
