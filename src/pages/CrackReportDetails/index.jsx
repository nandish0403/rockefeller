import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { toMediaUrl } from "@/utils/mediaUrl";

function toPct(value) {
  if (value == null) return "-";
  return `${Math.round(Number(value) * 100)}%`;
}

function isCritical(report) {
  if (!report) return false;
  if ((report.severity || "").toLowerCase() === "critical") return true;
  if ((report.ai_severity_class || "").toLowerCase() === "critical") return true;
  if (Number(report.critical_crack_flag || 0) === 1) return true;
  return Number(report.ai_risk_score || 0) >= 0.7;
}

export default function CrackReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusErr, setStatusErr] = useState("");

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "safety_officer";
  const critical = useMemo(() => isCritical(report), [report]);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setStatusErr("");
    try {
      const { data } = await api.get(`/api/crack-reports/${id}`);
      setReport(data || null);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const runAction = async (action) => {
    if (!report?.id || !isAdmin) return;
    setBusy(true);
    setStatusErr("");
    setStatusMsg("");
    try {
      if (action === "notify") {
        const { data } = await api.patch(`/api/crack-reports/${report.id}/notify-critical`);
        const notified = Number(data?.notified_users ?? 0);
        const inside = Number(data?.notified_inside_zone_workers ?? 0);
        const outside = Number(data?.notified_outside_zone_workers ?? 0);
        const nonWorkers = Number(data?.notified_non_workers ?? 0);
        if (notified > 0) {
          setStatusMsg(
            `Critical notification sent to ${notified} users (${inside} inside-zone, ${outside} outside-zone, ${nonWorkers} non-workers).`
          );
        } else {
          setStatusErr("No recipients were found for this critical alert. Check worker zone or district mapping.");
        }
      } else if (action === "verify") {
        const { data } = await api.patch(`/api/crack-reports/${report.id}/verify`);
        const notified = Number(data?.notified_users ?? 0);
        const inside = Number(data?.notified_inside_zone_workers ?? 0);
        const outside = Number(data?.notified_outside_zone_workers ?? 0);
        const nonWorkers = Number(data?.notified_non_workers ?? 0);
        setStatusMsg(
          `Verified and notified ${notified} users (${inside} inside-zone, ${outside} outside-zone, ${nonWorkers} non-workers).`
        );
      } else if (action === "safe") {
        await api.patch(`/api/crack-reports/${report.id}/review`, {
          status: "reviewed",
          engineer_action: "confirmed_safe",
        });
        setStatusMsg("Marked as reviewed/safe.");
      } else if (action === "reject") {
        await api.patch(`/api/crack-reports/${report.id}/reject`);
        setStatusMsg("Report rejected and submitter notified.");
      }
      await load();
    } catch (err) {
      setStatusErr(err?.response?.data?.detail || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 32, color: "#e5e2e1" }}>Loading crack report...</div>;
  }

  if (!report) {
    return (
      <div style={{ padding: 32, color: "#e5e2e1" }}>
        <h3>Crack report not found</h3>
        <button onClick={() => navigate("/crack-reports")}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 80px", fontFamily: "Inter, sans-serif" }}>
      <button
        onClick={() => navigate("/crack-reports")}
        style={{
          marginBottom: 16,
          border: "none",
          background: "transparent",
          color: "#e4beba",
          fontSize: 11,
          cursor: "pointer",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Back to Crack Reports
      </button>

      <div style={{ background: "#201f1f", borderRadius: 8, border: "1px solid rgba(91,64,62,0.15)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr" }}>
          <div style={{ minHeight: 300, background: "#1a1a1a" }}>
            {report.photo_url ? (
              <img src={toMediaUrl(report.photo_url)} alt="crack" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#9f9a99", padding: 24 }}>No image available</div>
            )}
          </div>

          <div style={{ padding: 20 }}>
            <h2 style={{ margin: "0 0 8px", color: "#e5e2e1" }}>{report.zone_name}</h2>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>Severity: {report.severity || "-"}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>AI Class: {report.ai_severity_class || "-"}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>AI Score: {toPct(report.ai_risk_score)}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>Confidence: {toPct(report.confidence)}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>Critical Flag: {report.critical_crack_flag ?? 0}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>Status: {report.status}</p>
            <p style={{ margin: "0 0 6px", color: "#e4beba" }}>Reported By: {report.reported_by}</p>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(91,64,62,0.12)", padding: 20 }}>
          <h3 style={{ margin: "0 0 8px", color: "#e5e2e1", fontSize: 14 }}>Remarks</h3>
          <p style={{ margin: 0, color: "#e4beba" }}>{report.remarks || "No remarks provided."}</p>
        </div>

        {isAdmin && (
          <div style={{ borderTop: "1px solid rgba(91,64,62,0.12)", padding: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {critical && (
              <button
                onClick={() => runAction("notify")}
                disabled={busy}
                style={{
                  border: "1px solid rgba(255,84,81,0.45)",
                  background: "rgba(255,84,81,0.12)",
                  color: "#ff5451",
                  borderRadius: 4,
                  padding: "10px 14px",
                  fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                }}
              >
                Notify Critical Users
              </button>
            )}

            <button
              onClick={() => runAction("verify")}
              disabled={busy}
              style={{
                border: "none",
                background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                color: "#68000a",
                borderRadius: 4,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Verify and Alert
            </button>

            <button
              onClick={() => runAction("safe")}
              disabled={busy}
              style={{
                border: "1px solid rgba(78,222,163,0.45)",
                background: "rgba(78,222,163,0.12)",
                color: "#4edea3",
                borderRadius: 4,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Mark Safe
            </button>

            <button
              onClick={() => runAction("reject")}
              disabled={busy}
              style={{
                border: "1px solid rgba(228,190,186,0.35)",
                background: "rgba(42,42,42,0.9)",
                color: "#e4beba",
                borderRadius: 4,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {statusMsg && <p style={{ color: "#4edea3", marginTop: 12 }}>{statusMsg}</p>}
      {statusErr && <p style={{ color: "#ff5451", marginTop: 12 }}>{statusErr}</p>}
    </div>
  );
}
