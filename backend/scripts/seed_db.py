import asyncio
import json
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.user import User, UserRole
from app.models.zone import Zone
from app.models.alert import Alert
from app.models.report import Report
from app.models.crack_report import CrackReport
from app.models.weather_record import WeatherRecord
from app.models.history import HistoricalLandslide
from app.core.security import hash_password
from app.core.config import settings

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        print(f"  Skipping {filename} — file not found")
        return []
    with open(path, "r") as f:
        return json.load(f)

async def seed():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]

    await init_beanie(
        database=db,
        document_models=[
            User, Zone, Alert, Report, CrackReport,
            WeatherRecord, HistoricalLandslide
        ]
    )

    # --- Zones ---
    zones_data = load_json("zones.json")
    await Zone.delete_all()
    for z in zones_data:
        zone = Zone(
            name=z.get("name", ""),
            mine_name=z.get("mineName", z.get("mine_name", "")),
            district=z.get("district", ""),
            risk_level=z.get("riskLevel", z.get("risk_level", "green")),
            risk_score=z.get("riskScore", z.get("risk_score", 0)),
            latlngs=z.get("latlngs", []),
            soil_type=z.get("soilType", z.get("soil_type", "")),
            slope_angle=z.get("slopeAngle", z.get("slope_angle", 0)),
            status=z.get("status", "monitoring"),
            last_landslide=z.get("lastLandslide", z.get("last_landslide", "")),
            blast_count_7d=z.get("blastCount7d", z.get("blast_count_7d", 0)),
            recent_rainfall=z.get("recentRainfall", z.get("recent_rainfall", 0)),
            last_updated=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        await zone.insert()
    print(f"  Seeded {len(zones_data)} zones")

    # --- Users ---
    users_data = load_json("users.json")
    await User.delete_all()
    for u in users_data:
        # give admin user admin123, everyone else password123
        pwd = "admin123" if u.get("role") == "admin" else "password123"
        user = User(
            name=u.get("name", ""),
            email=u.get("email", f"{u.get('name','user').lower().replace(' ','.')}@geoalert.com"),
            password_hash=hash_password(pwd),
            role=u.get("role", "field_worker").lower().replace(" ", "_"),
            zone_assigned=u.get("zoneAssigned", u.get("zone_assigned", "")),
            district=u.get("district", ""),
            avatar_url=u.get("avatar", ""),
            created_at=datetime.utcnow()
        )
        await user.insert()
    print(f"  Seeded {len(users_data)} users  (admin@geoalert.com / admin123)")

    # --- Alerts ---
    alerts_data = load_json("alerts.json")
    await Alert.delete_all()
    for a in alerts_data:
        alert = Alert(
            zone_id=a.get("zoneId", a.get("zone_id", "")),
            zone_name=a.get("zoneName", a.get("zone_name", "")),
            district=a.get("district", ""),
            risk_level=a.get("riskLevel", a.get("risk_level", "yellow")),
            trigger_reason=a.get("triggerReason", a.get("trigger_reason", "")),
            trigger_source=a.get("triggerSource", a.get("trigger_source", "rule_engine")),
            recommended_action=a.get("recommendedAction", a.get("recommended_action", "")),
            status=a.get("status", "active"),
            created_at=datetime.utcnow()
        )
        await alert.insert()
    print(f"  Seeded {len(alerts_data)} alerts")

    # --- Reports ---
    reports_data = load_json("reports.json")
    await Report.delete_all()
    for r in reports_data:
        report = Report(
            zone_id=r.get("zoneId", r.get("zone_id", "")),
            zone_name=r.get("zoneName", r.get("zone_name", "")),
            reported_by=r.get("reportedBy", r.get("reported_by", "")),
            photo_url=r.get("image", r.get("photo_url", "")),
            coords=r.get("coords", None),
            severity=r.get("severity", "low"),
            remarks=r.get("remarks", ""),
            review_status=r.get("reviewStatus", r.get("review_status", "pending")),
            created_at=datetime.utcnow()
        )
        await report.insert()
    print(f"  Seeded {len(reports_data)} reports")

    # --- Crack Reports ---
    crack_data = load_json("crackReports.json")
    await CrackReport.delete_all()
    for c in crack_data:
        crack = CrackReport(
            zone_id=c.get("zoneId", c.get("zone_id", "")),
            zone_name=c.get("zoneName", c.get("zone_name", "")),
            reported_by=c.get("reportedBy", c.get("reported_by", "")),
            photo_url=c.get("photo", c.get("photo_url", "")),
            crack_type=c.get("crackType", c.get("crack_type", "other")),
            severity=c.get("severity", "low"),
            remarks=c.get("remarks", ""),
            ai_severity_class=None,   # ML not ready
            ai_risk_score=None,       # ML not ready
            annotated_photo_url=None, # ML not ready
            status="pending",
            created_at=datetime.utcnow()
        )
        await crack.insert()
    print(f"  Seeded {len(crack_data)} crack reports")

    # --- Weather ---
    weather_data = load_json("weather.json")
    await WeatherRecord.delete_all()
    for w in weather_data:
        record = WeatherRecord(
            district=w.get("district", ""),
            recorded_at=datetime.utcnow(),
            rainfall_mm=w.get("rainfallLast24h", w.get("rainfall_mm", 0)),
            warning_level=w.get("warningLevel", w.get("warning_level", "none")).lower(),
            trend=w.get("trend", "stable")
        )
        await record.insert()
    print(f"  Seeded {len(weather_data)} weather records")

    # --- History ---
    history_data = load_json("history.json")
    await HistoricalLandslide.delete_all()
    for h in history_data:
        event = HistoricalLandslide(
            zone_id=h.get("zoneId", h.get("zone_id", "")),
            date=h.get("date", ""),
            type=h.get("type", "landslide"),
            magnitude=h.get("magnitude", None),
            damage_level=h.get("damageLevel", h.get("damage_level", "none")),
            notes=h.get("notes", ""),
            created_at=datetime.utcnow()
        )
        await event.insert()
    print(f"  Seeded {len(history_data)} history records")

    client.close()
    print("\nSeed complete.")

if __name__ == "__main__":
    print("Seeding GeoAlert database...\n")
    asyncio.run(seed())
