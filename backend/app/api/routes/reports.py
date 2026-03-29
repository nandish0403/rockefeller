from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional
from datetime import datetime
import os, shutil, uuid
from pydantic import BaseModel
from app.models.report import Report
from app.models.zone import Zone
from app.api.dependencies import get_current_user
from app.core.config import settings
from app.models.user import User
from app.services.report_ai import generate_report_draft

router = APIRouter(prefix="/api/reports", tags=["reports"])


class ReportAIDraftRequest(BaseModel):
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    report_type: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    observations: Optional[str] = None
    location_detail: Optional[str] = None
    weather_condition: Optional[str] = None


@router.post("/generate-ai-draft")
async def generate_ai_draft(
    body: ReportAIDraftRequest,
    current_user: User = Depends(get_current_user),
):
    payload = body.model_dump(exclude_none=True)

    if body.zone_id and "zone_name" not in payload:
        zone = await Zone.get(body.zone_id)
        if zone:
            payload["zone_name"] = zone.name

    try:
        draft = generate_report_draft(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return {
        "draft": draft,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_for": current_user.name,
    }

def report_to_dict(r: Report) -> dict:
    return {
        "id":           str(r.id),
        "zone_id":      r.zone_id,
        "zone_name":    r.zone_name,
        "reported_by":  r.reported_by,
        "photo_url":    r.photo_url,
        "severity":     r.severity,
        "remarks":      r.remarks,
        "review_status":r.review_status,
        "created_at":   r.created_at.isoformat() if r.created_at else None,
    }

# ✅ All logged-in users can view reports
@router.get("")
async def get_reports(
    zone_id:  Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    reports = await Report.find().to_list()
    if zone_id:  reports = [r for r in reports if r.zone_id == zone_id]
    if severity: reports = [r for r in reports if r.severity == severity]
    reports.sort(key=lambda r: r.created_at or datetime.min, reverse=True)
    return [report_to_dict(r) for r in reports]

@router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
):
    report = await Report.get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report_to_dict(report)

# ✅ All logged-in users can submit reports
@router.post("", status_code=201)
async def create_report(
    zone_id:     str        = Form(...),
    severity:    str        = Form("medium"),
    remarks:     str        = Form(""),
    reported_by: str        = Form(""),
    photo:       UploadFile = File(None),
    current_user: User      = Depends(get_current_user),
):
    zone = await Zone.get(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    photo_url = None
    if photo and photo.filename:
        ext      = os.path.splitext(photo.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        dest     = os.path.join(settings.UPLOAD_DIR, "reports", filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_url = f"/uploads/reports/{filename}"

    report = Report(
        zone_id      = str(zone.id),
        zone_name    = zone.name,
        reported_by  = reported_by or current_user.name,
        photo_url    = photo_url,
        severity     = severity,
        remarks      = remarks,
        review_status= "pending",
        created_at   = datetime.utcnow(),
    )
    await report.insert()
    return report_to_dict(report)
