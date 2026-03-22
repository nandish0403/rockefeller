import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
from app.models.alert import Alert

SACHET_RSS = "https://sachet.ndma.gov.in/rss/alerts.xml"

# Only pull alerts for our districts
TARGET_DISTRICTS = {
    "nagpur", "chandrapur", "gadchiroli",
    "yavatmal", "amravati", "bhandara", "gondia", "wardha"
}

SEVERITY_MAP = {
    "Extreme": "red",
    "Severe":  "red",
    "Moderate":"orange",
    "Minor":   "yellow",
    "Unknown": "yellow",
}

async def run():
    """Called on backend startup — pulls active NDMA disaster alerts."""
    print("[NDMA Collector] Checking SACHET alerts...")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(SACHET_RSS)

        if res.status_code != 200:
            print(f"[NDMA Collector] RSS unavailable ({res.status_code}) — skipping.")
            return

        root  = ET.fromstring(res.text)
        items = root.findall(".//item")
        saved = 0

        for item in items:
            title       = item.findtext("title", "")
            description = item.findtext("description", "")
            pub_date    = item.findtext("pubDate", "")

            # Check if alert is for our districts
            combined = (title + description).lower()
            matched  = next((d for d in TARGET_DISTRICTS if d in combined), None)
            if not matched:
                continue

            # Skip if already saved (same title today)
            existing = await Alert.find(Alert.trigger_reason == title).to_list()
            if existing:
                continue

            severity   = "Moderate"
            risk_level = SEVERITY_MAP.get(severity, "orange")

            alert = Alert(
                zone_id            = "district_wide",
                zone_name          = matched.capitalize(),
                district           = matched.capitalize(),
                risk_level         = risk_level,
                trigger_reason     = title,
                trigger_source     = "ndma_sachet",
                recommended_action = description[:200] if description else None,
                status             = "active",
                created_at         = datetime.utcnow(),
            )
            await alert.insert()
            saved += 1
            print(f"  ✅ Alert saved: {title[:60]}")

        print(f"[NDMA Collector] Done. {saved} new alerts saved.")

    except Exception as e:
        print(f"[NDMA Collector] Failed: {e} — skipping.")
