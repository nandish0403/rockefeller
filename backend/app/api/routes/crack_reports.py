
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
import os, uuid
import re
import json
from app.models.crack_report import CrackReport
from app.models.alert import Alert, TriggerSource
from app.models.notification import NotificationType
from app.models.zone import Zone
from app.api.dependencies import get_current_user, require_admin, require_officer
from app.core.rule_engine import run_crack_check
from app.core.config import settings
from app.models.user import User
from app.services.notification_service import create_notifications_for_users
from app.services.crack_ai import score_crack_image

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


def _norm(value: Optional[str]) -> str:
    return str(value or "").strip().lower()


def _match_worker_zone_refs(worker: User, refs: set[str]) -> bool:
    return _norm(worker.zone_assigned) in refs


async def _target_workers_for_zone(zone: Zone, report: Optional[CrackReport] = None) -> list[User]:
    legacy_zone_code = await _legacy_zone_code_for(zone)
    raw_refs = [str(zone.id), zone.name, legacy_zone_code]

    if report:
        raw_refs.extend([report.zone_id, report.zone_name])

    zone_refs = {_norm(ref) for ref in raw_refs if ref}
    workers = await User.find(User.role == "field_worker").to_list()

    matched = [worker for worker in workers if _match_worker_zone_refs(worker, zone_refs)]
    if matched:
        return matched

    # Fallback: if zone refs do not match due legacy assignment format,
    # notify workers from the same district so critical alerts are not dropped.
    district_key = _norm(zone.district)
    district_workers = [worker for worker in workers if _norm(worker.district) == district_key]
    if district_workers:
        return district_workers

    # Final fallback for critical alerts in partially configured environments.
    return workers


async def _target_engineers_for_zone(zone: Zone, report: Optional[CrackReport] = None) -> list[User]:
    legacy_zone_code = await _legacy_zone_code_for(zone)
    raw_refs = [str(zone.id), zone.name, legacy_zone_code]

    if report:
        raw_refs.extend([report.zone_id, report.zone_name])

    zone_refs = {_norm(ref) for ref in raw_refs if ref}
    district_key = _norm(zone.district)

    officers = await User.find(User.role == "safety_officer").to_list()
    matched = [
        officer
        for officer in officers
        if _match_worker_zone_refs(officer, zone_refs) or _norm(officer.district) == district_key
    ]
    if matched:
        return matched

    # Fallback so at least an admin receives engineer-check instructions.
    return await User.find(User.role == "admin").to_list()


async def _zone_refs_for_matching(zone: Zone, report: Optional[CrackReport] = None) -> set[str]:
    legacy_zone_code = await _legacy_zone_code_for(zone)
    raw_refs = [str(zone.id), zone.name, legacy_zone_code]
    if report:
        raw_refs.extend([report.zone_id, report.zone_name])
    return {_norm(ref) for ref in raw_refs if ref}


async def _split_users_by_zone_scope(
    zone: Zone,
    report: Optional[CrackReport] = None,
) -> tuple[list[User], list[User], list[User]]:
    all_users = await User.find().to_list()
    zone_refs = await _zone_refs_for_matching(zone, report)

    inside_zone_workers = [
        user
        for user in all_users
        if user.role == "field_worker" and _match_worker_zone_refs(user, zone_refs)
    ]
    inside_worker_id_set = {str(user.id) for user in inside_zone_workers}

    outside_zone_workers = [
        user
        for user in all_users
        if user.role == "field_worker" and str(user.id) not in inside_worker_id_set
    ]

    non_worker_users = [
        user
        for user in all_users
        if user.role != "field_worker"
    ]

    return inside_zone_workers, outside_zone_workers, non_worker_users


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

    inside_zone_workers, outside_zone_workers, non_worker_users = await _split_users_by_zone_scope(
        zone,
        report,
    )

    inside_ids = [str(user.id) for user in inside_zone_workers]
    outside_ids = [str(user.id) for user in outside_zone_workers]
    non_worker_ids = [str(user.id) for user in non_worker_users]

    if inside_ids:
        await create_notifications_for_users(
            inside_ids,
            title="Verified Crack Alert - Inside Zone",
            message=(
                f"You are assigned to {zone.name}. This crack report is verified and your zone is unsafe. "
                "Stop work immediately, evacuate to the nearest safety point, and wait for clearance."
            ),
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.alert,
            send_push=True,
        )

    if outside_ids:
        await create_notifications_for_users(
            outside_ids,
            title="Verified Crack Advisory - Outside Zone",
            message=(
                f"A verified crack incident is active in {zone.name}. "
                "You are outside the affected zone. Keep clear of that area and follow supervisor instructions."
            ),
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.warning,
            send_push=True,
        )

    if non_worker_ids:
        await create_notifications_for_users(
            non_worker_ids,
            title="Verified Crack Broadcast - Systemwide",
            message=(
                f"Crack report verified in {zone.name}. "
                "Inside-zone workers were ordered to evacuate and outside-zone workers were advised to avoid the area."
            ),
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
        "notified_users": len(inside_ids) + len(outside_ids) + len(non_worker_ids),
        "notified_inside_zone_workers": len(inside_ids),
        "notified_outside_zone_workers": len(outside_ids),
        "notified_non_workers": len(non_worker_ids),
        "notified_engineers": len(non_worker_ids),
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
        "confidence":        c.confidence,
        "critical_crack_flag": c.critical_crack_flag,
        "photo_url":         c.photo_url,
        "status":            c.status,
        "reported_by":       c.reported_by,
        "remarks":           c.remarks,
        "reviewed_by":       c.reviewed_by,
        "reviewed_at":       c.reviewed_at.isoformat() if c.reviewed_at else None,
        "created_at":        c.created_at.isoformat() if c.created_at else None,
    }


def _is_critical_report(report: CrackReport) -> bool:
    if (report.severity or "").lower() == "critical":
        return True
    if (report.ai_severity_class or "").lower() in {"critical", "high"}:
        return True
    if int(report.critical_crack_flag or 0) == 1:
        return True
    return float(report.ai_risk_score or 0.0) >= 0.7


async def _notify_admins_new_crack(
    report: CrackReport,
    *,
    submission_mode: str,
) -> int:
    admins = await User.find(User.role == "admin").to_list()
    if not admins:
        admins = await User.find(User.role == "safety_officer").to_list()

    admin_ids = [str(admin.id) for admin in admins]
    if not admin_ids:
        return 0

    if submission_mode == "ai" and report.ai_risk_score is not None:
        score_pct = int(round(float(report.ai_risk_score) * 100))
        message = (
            f"{report.zone_name}: new AI-scored crack report by {report.reported_by} "
            f"({report.ai_severity_class}, risk {score_pct}%)."
        )
    else:
        message = f"{report.zone_name}: new crack report submitted by {report.reported_by} for manual review."

    await create_notifications_for_users(
        admin_ids,
        title="New Crack Report",
        message=message,
        zone_id=report.zone_id,
        zone_name=report.zone_name,
        notif_type=NotificationType.warning,
        send_push=True,
    )
    return len(admin_ids)

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
    remarks:     str        = Form(""),
    reported_by: str        = Form(""),
    coords:      Optional[str] = Form(None),
    submission_mode: str = Form("ai"),
    photo:       UploadFile = File(None),
    current_user: User      = Depends(get_current_user),
):
    zone = await _resolve_zone(zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Normalize crack_type to valid enum value
    normalized_type = CRACK_TYPE_MAP.get(crack_type.lower(), "other")

    mode = (submission_mode or "ai").strip().lower()
    if mode not in {"ai", "admin"}:
        raise HTTPException(status_code=400, detail="submission_mode must be 'ai' or 'admin'")

    if not photo or not photo.filename:
        raise HTTPException(status_code=400, detail="Photo is required")

    photo_bytes = await photo.read()
    if not photo_bytes:
        raise HTTPException(status_code=400, detail="Photo is empty")

    parsed_coords = None
    if coords:
        try:
            parsed_coords = json.loads(coords)
        except Exception:
            parsed_coords = None

    ai_result = None
    if mode == "ai":
        try:
            ai_result = score_crack_image(photo_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid crack image: {exc}")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Crack AI inference failed: {exc}")

    ext = os.path.splitext(photo.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    dest = os.path.join(settings.UPLOAD_DIR, "crack_reports", filename)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(photo_bytes)
    photo_url = f"/uploads/crack_reports/{filename}"

    report = CrackReport(
        zone_id           = str(zone.id),
        zone_name         = zone.name,
        reported_by       = reported_by or current_user.name,
        reporter_user_id  = str(current_user.id),
        coords            = parsed_coords,
        crack_type        = normalized_type,
        severity          = ai_result["ai_severity_class"] if ai_result else severity,
        ai_severity_class = ai_result["ai_severity_class"] if ai_result else None,
        ai_risk_score     = ai_result["ai_risk_score"] if ai_result else None,
        confidence        = ai_result["confidence"] if ai_result else None,
        critical_crack_flag = ai_result["critical_crack_flag"] if ai_result else 0,
        photo_url         = photo_url,
        remarks           = remarks,
        status            = "ai_scored" if ai_result else "pending",
        created_at        = datetime.utcnow(),
    )
    await report.insert()

    # Trigger Model 2 zone risk update only for AI-scored submissions.
    if ai_result:
        await run_crack_check(str(zone.id), float(ai_result["ai_risk_score"]))

    admin_notified = await _notify_admins_new_crack(report, submission_mode=mode)

    response = crack_to_dict(report)
    response["submission_mode"] = mode
    response["admin_notified"] = admin_notified
    if ai_result:
        response["ai_summary"] = {
            "ai_severity_class": ai_result["ai_severity_class"],
            "ai_risk_score": ai_result["ai_risk_score"],
            "confidence": ai_result["confidence"],
            "critical_crack_flag": ai_result["critical_crack_flag"],
            "note": "AI score generated and forwarded to admin review queue.",
        }
    else:
        response["ai_summary"] = None

    return response


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


@router.patch("/{report_id}/notify-critical")
async def notify_critical_crack_report(
    report_id: str,
    current_user: User = Depends(require_officer),
):
    report = await _get_report_or_error(report_id)

    if not _is_critical_report(report):
        raise HTTPException(status_code=400, detail="Report is not in critical threshold")

    zone = await _resolve_zone(report.zone_id, report.zone_name)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    inside_zone_workers, outside_zone_workers, non_worker_users = await _split_users_by_zone_scope(
        zone,
        report,
    )

    inside_ids = [str(user.id) for user in inside_zone_workers]
    outside_ids = [str(user.id) for user in outside_zone_workers]
    non_worker_ids = [str(user.id) for user in non_worker_users]

    if inside_ids:
        await create_notifications_for_users(
            inside_ids,
            title="Critical Crack Warning - Inside Zone",
            message=(
                f"You are assigned to {zone.name}. A critical crack alert is active in your zone. "
                "Stop work immediately, evacuate to the nearest safety point, and await official clearance."
            ),
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.alert,
            send_push=True,
        )

    if outside_ids:
        await create_notifications_for_users(
            outside_ids,
            title="Critical Crack Advisory - Outside Zone",
            message=(
                f"Critical crack activity has been reported in {zone.name}. "
                "You are outside the affected zone. Keep clear of that area and follow supervisor instructions."
            ),
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.warning,
            send_push=True,
        )

    if non_worker_ids:
        await create_notifications_for_users(
            non_worker_ids,
            title="Critical Crack Broadcast - Systemwide",
            message=(
                f"Critical crack alert confirmed in {zone.name}. "
                "Inside-zone workers were ordered to evacuate and outside-zone workers were advised to avoid the area."
            ),
            zone_id=str(zone.id),
            zone_name=zone.name,
            notif_type=NotificationType.alert,
            send_push=True,
        )

    return {
        "report": crack_to_dict(report),
        "notified_users": len(inside_ids) + len(outside_ids) + len(non_worker_ids),
        "notified_inside_zone_workers": len(inside_ids),
        "notified_outside_zone_workers": len(outside_ids),
        "notified_non_workers": len(non_worker_ids),
        "zone_name": zone.name,
    }
