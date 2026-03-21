from datetime import datetime, timedelta
from app.models.zone import Zone
from app.models.alert import Alert
from app.models.blast_event import BlastEvent
from app.core.config import settings

async def update_zone_risk(zone_id: str, new_level: str, new_score: float):
    """Update a zone's risk level and score in MongoDB."""
    zone = await Zone.get(zone_id)
    if not zone:
        return
    zone.risk_level   = new_level
    zone.risk_score   = new_score
    zone.last_updated = datetime.utcnow()
    await zone.save()

async def create_auto_alert(zone: Zone, trigger_reason: str,
                             trigger_source: str, risk_level: str,
                             recommended_action: str = None):
    """Create an alert automatically when a threshold is crossed."""
    alert = Alert(
        zone_id            = str(zone.id),
        zone_name          = zone.name,
        district           = zone.district,
        risk_level         = risk_level,
        trigger_reason     = trigger_reason,
        trigger_source     = trigger_source,
        recommended_action = recommended_action,
        status             = "active",
        created_at         = datetime.utcnow(),
    )
    await alert.insert()
    return alert

async def run_blast_check(zone_id: str):
    """
    After a new blast event is saved:
    Count blasts in last 7 days → update risk → create alert if threshold crossed.
    """
    zone = await Zone.get(zone_id)
    if not zone:
        return

    cutoff = datetime.utcnow() - timedelta(days=7)
    blasts = await BlastEvent.find(
        BlastEvent.zone_id == zone_id,
    ).to_list()

    # Filter recent ones (Beanie filter on datetime field)
    recent_blasts = [b for b in blasts if b.blast_date and b.blast_date >= cutoff]
    count = len(recent_blasts)

    # Update zone blast count
    zone.blast_count_7d = count
    await zone.save()

    if count >= settings.BLAST_ORANGE_THRESHOLD:           # 10+
        await update_zone_risk(zone_id, "red", 0.85)
        await create_auto_alert(
            zone,
            trigger_reason     = f"{count} blasts recorded in last 7 days — critical threshold exceeded",
            trigger_source     = "blast_threshold",
            risk_level         = "red",
            recommended_action = "Halt all blast operations. Inspect zone for structural damage.",
        )
    elif count >= settings.BLAST_YELLOW_THRESHOLD:         # 5+
        await update_zone_risk(zone_id, "orange", 0.60)
        await create_auto_alert(
            zone,
            trigger_reason     = f"{count} blasts recorded in last 7 days — warning threshold reached",
            trigger_source     = "blast_threshold",
            risk_level         = "orange",
            recommended_action = "Reduce blast frequency. Monitor zone closely.",
        )

async def run_rainfall_check(district: str, rainfall_mm: float):
    """
    After a new weather record is saved:
    Find all zones in this district → update their risk based on rainfall.
    """
    zones = await Zone.find(Zone.district == district).to_list()

    for zone in zones:
        zone.recent_rainfall = rainfall_mm
        await zone.save()

        if rainfall_mm >= settings.RAINFALL_RED_THRESHOLD_MM:        # 350mm+
            await update_zone_risk(str(zone.id), "red", 0.90)
            await create_auto_alert(
                zone,
                trigger_reason     = f"Extreme rainfall: {rainfall_mm}mm in {district}",
                trigger_source     = "rainfall_threshold",
                risk_level         = "red",
                recommended_action = "Evacuate high-risk areas. Deploy emergency response.",
            )
        elif rainfall_mm >= settings.RAINFALL_ORANGE_THRESHOLD_MM:   # 250mm+
            await update_zone_risk(str(zone.id), "orange", 0.65)
            await create_auto_alert(
                zone,
                trigger_reason     = f"Heavy rainfall: {rainfall_mm}mm in {district}",
                trigger_source     = "rainfall_threshold",
                risk_level         = "orange",
                recommended_action = "Issue warning to field workers. Monitor drainage.",
            )
        elif rainfall_mm >= settings.RAINFALL_YELLOW_THRESHOLD_MM:   # 150mm+
            await update_zone_risk(str(zone.id), "yellow", 0.40)
            await create_auto_alert(
                zone,
                trigger_reason     = f"Moderate rainfall: {rainfall_mm}mm in {district}",
                trigger_source     = "rainfall_threshold",
                risk_level         = "yellow",
                recommended_action = "Alert field workers. Check drainage systems.",
            )

async def run_crack_check(zone_id: str, ai_risk_score: float):
    """
    After a crack report is submitted with an AI score:
    Update zone risk if crack severity is high enough.
    """
    zone = await Zone.get(zone_id)
    if not zone:
        return

    if ai_risk_score >= settings.CRACK_RISK_CRITICAL_THRESHOLD:     # 0.7+
        await update_zone_risk(zone_id, "red", ai_risk_score)
        await create_auto_alert(
            zone,
            trigger_reason     = f"Critical crack detected — AI risk score: {ai_risk_score:.2f}",
            trigger_source     = "crack_confirmed",
            risk_level         = "red",
            recommended_action = "Immediate inspection required. Consider zone evacuation.",
        )
    elif ai_risk_score >= settings.CRACK_RISK_FLAG_THRESHOLD:        # 0.4+
        await update_zone_risk(zone_id, "orange", ai_risk_score)
        await create_auto_alert(
            zone,
            trigger_reason     = f"Significant crack flagged — AI risk score: {ai_risk_score:.2f}",
            trigger_source     = "crack_confirmed",
            risk_level         = "orange",
            recommended_action = "Send field team for manual inspection.",
        )
