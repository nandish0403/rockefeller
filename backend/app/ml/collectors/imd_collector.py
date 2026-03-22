import httpx
import asyncio
from datetime import datetime, timedelta
from app.models.weather_record import WeatherRecord

# Maharashtra districts with lat/lon for Open-Meteo API (free, no key needed)
DISTRICTS = {
    "Nagpur":     {"lat": 21.1458, "lon": 79.0882},
    "Chandrapur": {"lat": 19.9615, "lon": 79.2961},
    "Gadchiroli": {"lat": 20.1809, "lon": 80.0000},
    "Yavatmal":   {"lat": 20.3888, "lon": 78.1204},
    "Amravati":   {"lat": 20.9374, "lon": 77.7796},
    "Bhandara":   {"lat": 21.1667, "lon": 79.6500},
    "Gondia":     {"lat": 21.4600, "lon": 80.1900},
    "Wardha":     {"lat": 20.7453, "lon": 78.6022},
}

WARNING_THRESHOLDS = {
    "extreme": 350,
    "warning": 250,
    "watch":   150,
    "none":    0,
}

def get_warning_level(rainfall_mm: float) -> str:
    if rainfall_mm >= 350: return "extreme"
    if rainfall_mm >= 250: return "warning"
    if rainfall_mm >= 150: return "watch"
    return "none"

def get_trend(current: float, previous: float) -> str:
    if current > previous * 1.2:  return "increasing"
    if current < previous * 0.8:  return "decreasing"
    return "stable"

async def fetch_district_rainfall(district: str, lat: float, lon: float) -> dict | None:
    """Fetch last 7 days of rainfall from Open-Meteo (free, no API key)."""
    end   = datetime.utcnow().date()
    start = end - timedelta(days=7)

    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start}&end_date={end}"
        f"&daily=precipitation_sum"
        f"&timezone=Asia%2FKolkata"
    )

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(url)
        if res.status_code != 200:
            print(f"[IMD Collector] Failed for {district}: {res.status_code}")
            return None

        data       = res.json()
        daily      = data.get("daily", {})
        dates      = daily.get("time", [])
        rainfall   = daily.get("precipitation_sum", [])

        if not rainfall:
            return None

        # Latest reading and 24h vs previous day
        latest_mm  = float(rainfall[-1] or 0)
        prev_mm    = float(rainfall[-2] or 0) if len(rainfall) > 1 else latest_mm
        total_7d   = sum(float(r or 0) for r in rainfall)

        return {
            "district":      district,
            "rainfall_mm":   latest_mm,
            "rainfall_7d":   round(total_7d, 2),
            "warning_level": get_warning_level(latest_mm),
            "trend":         get_trend(latest_mm, prev_mm),
            "recorded_at":   datetime.utcnow(),
            "source":        "open-meteo",
        }

async def run():
    """Called on backend startup — pulls latest rainfall for all districts."""
    print("[IMD Collector] Starting rainfall collection...")
    success = 0

    for district, coords in DISTRICTS.items():
        try:
            data = await fetch_district_rainfall(district, coords["lat"], coords["lon"])
            if not data:
                continue

            # Save to Atlas
            record = WeatherRecord(
                district      = data["district"],
                rainfall_mm   = data["rainfall_mm"],
                warning_level = data["warning_level"],
                trend         = data["trend"],
                source        = data["source"],
                recorded_at   = data["recorded_at"],
            )
            await record.insert()
            success += 1
            print(f"  ✅ {district}: {data['rainfall_mm']}mm ({data['warning_level']})")

        except Exception as e:
            print(f"  ❌ {district}: {e}")

        await asyncio.sleep(0.5)   # be polite to the API

    print(f"[IMD Collector] Done. {success}/{len(DISTRICTS)} districts updated.")
