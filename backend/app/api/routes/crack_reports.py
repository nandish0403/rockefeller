
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional
from datetime import datetime
import os, shutil, uuid
from app.models.crack_report import CrackReport
from app.models.zone import Zone
from app.api.dependencies import get_current_user, require_officer
from app.core.rule_engine import run_crack_check
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/api/crack-reports", tags=["crack-reports"])

# Map free-text crack type to valid CrackType enum values
CRACK_TYPE_MAP = {
    "parallel crack":   "parallel",
    "tension crack":    "tension_crack",
    "shear crack":      "surface_fracture",
    "settlement crack": "other",
    "water seepage":    "water_seepage",
    "rockfall":         "rockfall_sign",
}

def crack_to_dict(c: CrackReport) -> dict:
    return {
        "id":                str(c.id),
        "zone_id":           c.zone_id,
        "zone_name":         c.zone_name,
        "crack_type":        c.crack_type,
        "severity":          c.severity,
        "ai_severity_class": c.ai_severity_class,
        "ai_risk_score":     c.ai_risk_score,
        "photo_url":         c.photo_url,
        "status":            c.status,
        "reported_by":       c.reported_by,
        "remarks":           c.remarks,
        "created_at":        c.created_at.isoformat() if c.created_at else None,
    }

@router.get("")
async def get_crack_reports(
    zone_id:  Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status:   Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    reports = await CrackReport.find().to_list()
    if zone_id:  reports = [r for r in reports if r.zone_id == zone_id]
    if severity: reports = [r for r in reports if r.severity == severity]
    if status:   reports = [r for r in reports if r.status == status]
    reports.sort(key=lambda r: r.created_at or datetime.min, reverse=True)
    return [crack_to_dict(r) for r in reports]

@router.get("/{report_id}")
async def get_crack_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    report = await CrackReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Crack report not found")
    return crack_to_dict(report)

@router.post("", status_code=201)
async def create_crack_report(
    zone_id:     str        = Form(...),
    crack_type:  str        = Form("other"),
    severity:    str        = Form("medium"),
    remarks:     str        = Form(""),
    reported_by: str        = Form(""),
    photo:       UploadFile = File(None),
    current_user: User      = Depends(get_current_user),
):
    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Normalize crack_type to valid enum value
    normalized_type = CRACK_TYPE_MAP.get(crack_type.lower(), "other")

    # Save photo if provided
    photo_url = None
    if photo and photo.filename:
        ext      = os.path.splitext(photo.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        dest     = os.path.join(settings.UPLOAD_DIR, "crack_reports", filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_url = f"/uploads/crack_reports/{filename}"

    # Severity → AI score mapping (placeholder until real ML model)
    severity_score_map = {"low": 0.2, "medium": 0.45, "high": 0.65, "critical": 0.85}
    ai_risk_score = severity_score_map.get(severity.lower(), 0.3)

    report = CrackReport(
        zone_id           = str(zone.id),
        zone_name         = zone.name,
        reported_by       = reported_by or current_user.name,
        crack_type        = normalized_type,
        severity          = severity,
        ai_severity_class = severity,
        ai_risk_score     = ai_risk_score,
        photo_url         = photo_url,
        remarks           = remarks,
        status            = "pending",
        created_at        = datetime.utcnow(),
    )
    await report.insert()

    # Trigger rule engine
    await run_crack_check(str(zone.id), ai_risk_score)

    return crack_to_dict(report)

# 🔒 Officer/admin can review
@router.patch("/{report_id}")
async def update_crack_report(
    report_id: str,
    body: dict,
    current_user: User = Depends(require_officer),
):
    report = await CrackReport.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Crack report not found")
    for key, value in body.items():
        if hasattr(report, key) and value is not None:
            setattr(report, key, value)
    await report.save()
    return crack_to_dict(report)
