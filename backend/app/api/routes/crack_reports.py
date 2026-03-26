
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
import os, shutil, uuid
import re
from app.models.crack_report import CrackReport
from app.models.alert import Alert, TriggerSource
from app.models.notification import NotificationType
from app.models.zone import Zone
from app.api.dependencies import get_current_user, require_admin, require_officer
from app.core.rule_engine import run_crack_check
from app.core.config import settings
from app.models.user import User
from app.services.notification_service import create_notifications_for_users

router = APIRouter(prefix="/api/crack-reports", tags=["crack-reports"])


def _parse_report_id(report_id: str) -> str:
    rid = (report_id or "").strip()
    if not rid:
        raise HTTPException(status_code=400, detail="Invalid crack report id")
    if " " in rid:
        raise HTTPException(status_code=400, detail="Expected a single crack report id")
    return rid


async def _get_report_or_error(report_id: str) -> CrackReport:
    rid = _parse_report_id(report_id)
    try:
        report = await CrackReport.get(rid)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid crack report id")
    if not report:
        raise HTTPException(status_code=404, detail="Crack report not found")
    return report


async def _resolve_zone(zone_ref: str, zone_name: Optional[str] = None) -> Optional[Zone]:
    """Resolve a zone from mixed refs: ObjectId, exact name, or legacy seed code (zNNN)."""
    # 1) Primary path: Mongo ObjectId string.
    if zone_ref:
        try:
            zone = await Zone.get(zone_ref)
            if zone:
                return zone
        except Exception:
            pass

    # 2) Name fallback (legacy reports often have correct zone_name even when zone_id is zNNN).
    lookup_names = [value.strip() for value in (zone_name, zone_ref) if value and value.strip()]
    for name in lookup_names:
        zone = await Zone.find_one(Zone.name == name)
        if zone:
            return zone

    # 3) Legacy seed fallback: z001 -> first seeded zone, z002 -> second, ...
    if zone_ref:
        match = re.fullmatch(r"z(\d+)", zone_ref.strip().lower())
        if match:
            idx = int(match.group(1)) - 1
            if idx >= 0:
                zones = await Zone.find().sort("created_at").to_list()
                if idx < len(zones):
                    return zones[idx]

    return None


async def _legacy_zone_code_for(zone: Zone) -> Optional[str]:
    """Best-effort reverse mapping from Zone document to legacy seed code like z001."""
    zones = await Zone.find().sort("created_at").to_list()
    target_id = str(zone.id)
    for idx, row in enumerate(zones, start=1):
        if str(row.id) == target_id:
            return f"z{idx:03d}"
    return None


async def _verify_report_and_notify(report: CrackReport, reviewer_name: str) -> dict:
    zone = await _resolve_zone(report.zone_id, report.zone_name)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    report.status = "verified"
    report.reviewed_by = reviewer_name
    report.reviewed_at = datetime.utcnow()
    await report.save()

    alert = Alert(
        zone_id=str(zone.id),
        zone_name=zone.name,
        district=zone.district,
        risk_level=zone.risk_level,
        trigger_reason=f"Verified crack report ({report.crack_type}) in {zone.name}",
        trigger_source=TriggerSource.crack_confirmed,
        recommended_action="Dispatch field inspection and monitor slope sensors.",
        status="active",
        created_at=datetime.utcnow(),
    )
    await alert.insert()

    legacy_zone_code = await _legacy_zone_code_for(zone)
    worker_zone_refs = {
        ref
        for ref in (str(zone.id), zone.name, report.zone_id, report.zone_name, legacy_zone_code)
        if ref
    }
    candidate_workers = await User.find(User.role == "field_worker").to_list()
    workers = [w for w in candidate_workers if w.zone_assigned in worker_zone_refs]

    worker_ids = [str(worker.id) for worker in workers]
    if worker_ids:
        await create_notifications_for_users(
            worker_ids,
            title="Crack Report Verified",
            message=f"{zone.name}: verified crack report triggered a new alert.",
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.alert,
            send_push=True,
        )

    return {
        "report": crack_to_dict(report),
        "alert": {
            "id": str(alert.id),
            "zone_id": alert.zone_id,
            "zone_name": alert.zone_name,
            "risk_level": alert.risk_level,
            "trigger_reason": alert.trigger_reason,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        },
        "notified_users": len(worker_ids),
    }

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
        "reporter_user_id":  c.reporter_user_id,
        "crack_type":        c.crack_type,
        "severity":          c.severity,
        "ai_severity_class": c.ai_severity_class,
        "ai_risk_score":     c.ai_risk_score,
        "photo_url":         c.photo_url,
        "status":            c.status,
        "reported_by":       c.reported_by,
        "remarks":           c.remarks,
        "reviewed_by":       c.reviewed_by,
        "reviewed_at":       c.reviewed_at.isoformat() if c.reviewed_at else None,
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
    report = await _get_report_or_error(report_id)
    return crack_to_dict(report)

@router.post("", status_code=201)
async def create_crack_report(
    zone_id:     str        = Form(...),
    crack_type:  str        = Form("other"),
    severity:    str        = Form("medium"),
    crack_score: Optional[float] = Form(None),
    remarks:     str        = Form(""),
    reported_by: str        = Form(""),
    photo:       UploadFile = File(None),
    current_user: User      = Depends(get_current_user),
):
    zone = await _resolve_zone(zone_id)
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

    # Use provided crack_score when available, otherwise map severity.
    severity_score_map = {"low": 0.2, "medium": 0.45, "high": 0.65, "critical": 0.85}
    ai_risk_score = float(crack_score) if crack_score is not None else severity_score_map.get(severity.lower(), 0.3)

    report = CrackReport(
        zone_id           = str(zone.id),
        zone_name         = zone.name,
        reported_by       = reported_by or current_user.name,
        reporter_user_id  = str(current_user.id),
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

    # Trigger Model 2 zone risk update based on fresh crack report.
    await run_crack_check(str(zone.id), ai_risk_score)

    refreshed_zone = await Zone.get(str(zone.id))
    if refreshed_zone:
        report.ai_risk_score = refreshed_zone.risk_score
        report.ai_severity_class = refreshed_zone.risk_level
        await report.save()

    return crack_to_dict(report)


@router.patch("/verify-bulk")
async def verify_crack_reports_bulk(
    body: dict,
    current_user: User = Depends(require_admin),
):
    report_ids_raw = body.get("report_ids") if isinstance(body, dict) else None
    if not isinstance(report_ids_raw, list):
        raise HTTPException(status_code=400, detail="report_ids must be an array")

    normalized_ids: List[str] = []
    failures = []
    seen = set()

    for raw in report_ids_raw:
        try:
            rid = _parse_report_id(str(raw))
        except HTTPException as exc:
            failures.append({"report_id": str(raw), "status": exc.status_code, "detail": exc.detail})
            continue
        if rid not in seen:
            seen.add(rid)
            normalized_ids.append(rid)

    results = []
    for rid in normalized_ids:
        try:
            report = await _get_report_or_error(rid)
            verified = await _verify_report_and_notify(report, current_user.name)
            results.append(
                {
                    "report_id": rid,
                    "status": 200,
                    "notified_users": verified["notified_users"],
                    "report": verified["report"],
                    "alert": verified["alert"],
                }
            )
        except HTTPException as exc:
            failures.append({"report_id": rid, "status": exc.status_code, "detail": exc.detail})

    return {
        "requested": len(report_ids_raw),
        "processed": len(normalized_ids),
        "verified": len(results),
        "failed": len(failures),
        "results": results,
        "errors": failures,
    }

# 🔒 Officer/admin can review
@router.patch("/{report_id}")
async def update_crack_report(
    report_id: str,
    body: dict,
    current_user: User = Depends(require_officer),
):
    report = await _get_report_or_error(report_id)
    for key, value in body.items():
        if hasattr(report, key) and value is not None:
            setattr(report, key, value)
    await report.save()
    return crack_to_dict(report)


@router.patch("/{report_id}/review")
async def review_crack_report(
    report_id: str,
    body: dict,
    current_user: User = Depends(require_officer),
):
    report = await _get_report_or_error(report_id)

    if body.get("status") is None:
        body["status"] = "reviewed"
    for key, value in body.items():
        if hasattr(report, key) and value is not None:
            setattr(report, key, value)

    report.reviewed_by = current_user.name
    report.reviewed_at = datetime.utcnow()
    await report.save()
    return crack_to_dict(report)


@router.patch("/{report_id}/verify")
async def verify_crack_report(
    report_id: str,
    current_user: User = Depends(require_admin),
):
    report = await _get_report_or_error(report_id)
    return await _verify_report_and_notify(report, current_user.name)


@router.patch("/{report_id}/reject")
async def reject_crack_report(
    report_id: str,
    current_user: User = Depends(require_admin),
):
    report = await _get_report_or_error(report_id)

    report.status = "rejected"
    report.reviewed_by = current_user.name
    report.reviewed_at = datetime.utcnow()
    await report.save()

    target_user_id = report.reporter_user_id
    if not target_user_id and report.reported_by:
        submitter = await User.find_one(User.name == report.reported_by)
        if submitter:
            target_user_id = str(submitter.id)

    notified = 0
    if target_user_id:
        await create_notifications_for_users(
            [target_user_id],
            title="Crack Report Reviewed",
            message=f"Your crack report for {report.zone_name} was reviewed and rejected.",
            zone_id=report.zone_id,
            zone_name=report.zone_name,
            notif_type=NotificationType.warning,
            send_push=True,
        )
        notified = 1

    return {
        "report": crack_to_dict(report),
        "notified_users": notified,
    }
