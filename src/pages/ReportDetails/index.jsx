import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { fetchReportById } from "../../api/reports";

const SEV = {
  critical: { color: "#ffb4ab", bg: "rgba(255,180,171,0.1)", label: "Critical" },
  high: { color: "#ffb3ad", bg: "rgba(255,179,173,0.1)", label: "High Risk" },
  medium: { color: "#ffb95f", bg: "rgba(255,185,95,0.1)", label: "Moderate" },
  low: { color: "#4edea3", bg: "rgba(78,222,163,0.1)", label: "Routine" },
};

const STATUS = {
  pending: { color: "#ffb95f", label: "Pending" },
  reviewed: { color: "#4edea3", label: "Reviewed" },
  false_alarm: { color: "#e4beba", label: "False Alarm" },
  critical: { color: "#ff5451", label: "Critical" },
};

function timeAgo(iso) {
  if (!iso) return "-";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ReportDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [zone, setZone] = useState(null);
  const [zoneAlerts, setZoneAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchReportById(id);
        if (!active) return;
        setReport(data || null);

        if (data?.zone_id) {
          const [zoneResp, alertsResp] = await Promise.all([
            api.get(`/api/zones/${data.zone_id}`).catch(() => ({ data: null })),
            api.get(`/api/alerts`, { params: { zone_id: data.zone_id } }).catch(() => ({ data: [] })),
          ]);

          if (!active) return;
          setZone(zoneResp.data || null);
          setZoneAlerts(alertsResp.data || []);
        }
      } catch {
        if (!active) return;
        setReport(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const sev = useMemo(() => SEV[report?.severity] || SEV.low, [report?.severity]);
  const st = useMemo(() => STATUS[report?.review_status] || STATUS.pending, [report?.review_status]);

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
        <div style={{ height: 220, borderRadius: 8, background: "#2a2a2a", animation: "pulse 1.2s infinite alternate" }} />
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: 32, fontFamily: "Inter, sans-serif", textAlign: "center" }}>
        <h3 style={{ color: "#e5e2e1" }}>Report not found</h3>
        <button
          onClick={() => navigate("/reports")}
          style={{
            marginTop: 10,
            border: "1px solid rgba(255,179,173,0.3)",
            background: "rgba(255,179,173,0.08)",
            color: "#ffb3ad",
            borderRadius: 4,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Back to Reports
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px 90px", fontFamily: "Inter, sans-serif" }}>
      <button
        onClick={() => navigate("/reports")}
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
        <- Back to Reports
      </button>

      <div
        style={{
          background: "#201f1f",
          border: "1px solid rgba(91,64,62,0.15)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0 }}>
          <div style={{ minHeight: 320, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {report.photo_url ? (
              <img src={report.photo_url} alt="report" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ color: "#5b403e", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 10 }}>No image attached</div>
            )}
          </div>

          <div style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: sev.color, background: sev.bg, borderRadius: 3, padding: "4px 8px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {sev.label}
              </span>
              <span style={{ fontSize: 10, color: st.color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {st.label}
              </span>
            </div>

            <h2 style={{ margin: "4px 0 6px", color: "#e5e2e1", fontSize: 24 }}>Full Field Report</h2>
            <p style={{ margin: 0, color: "#e4beba", opacity: 0.7, fontSize: 12 }}>
              Zone: <strong style={{ color: "#fff" }}>{report.zone_name}</strong>
            </p>

            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Meta label="Reported By" value={report.reported_by || "Unknown"} />
              <Meta label="Created" value={timeAgo(report.created_at)} />
              <Meta label="Zone ID" value={report.zone_id || "-"} />
              <Meta label="Report ID" value={report.id || "-"} mono />
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(91,64,62,0.12)", padding: 22 }}>
          <h3 style={{ margin: "0 0 8px", color: "#e5e2e1", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>Remarks</h3>
          <p style={{ margin: 0, color: "#e4beba", lineHeight: 1.7, fontSize: 13 }}>
            {report.remarks || "No remarks entered by reporter."}
          </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(91,64,62,0.12)", padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <h3 style={{ margin: "0 0 10px", color: "#e5e2e1", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em" }}>Zone Snapshot</h3>
            {zone ? (
              <>
                <p style={{ margin: "0 0 6px", color: "#e4beba", fontSize: 12 }}>Mine: <strong style={{ color: "#fff" }}>{zone.mine_name}</strong></p>
                <p style={{ margin: "0 0 6px", color: "#e4beba", fontSize: 12 }}>District: <strong style={{ color: "#fff" }}>{zone.district}</strong></p>
                <p style={{ margin: "0 0 6px", color: "#e4beba", fontSize: 12 }}>Current Risk: <strong style={{ color: "#fff" }}>{zone.risk_level}</strong></p>
                <p style={{ margin: 0, color: "#e4beba", fontSize: 12 }}>Risk Score: <strong style={{ color: "#fff" }}>{Math.round((zone.risk_score || 0) * 100)}%</strong></p>
              </>
            ) : (
              <p style={{ margin: 0, color: "#9f9a99", fontSize: 12 }}>Zone details unavailable.</p>
            )}
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px", color: "#e5e2e1", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recent Zone Alerts</h3>
            {zoneAlerts.length === 0 ? (
              <p style={{ margin: 0, color: "#9f9a99", fontSize: 12 }}>No recent alerts for this zone.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {zoneAlerts.slice(0, 3).map((a) => (
                  <div key={a.id} style={{ background: "#1a1a1a", border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: "8px 10px" }}>
                    <p style={{ margin: "0 0 3px", color: "#e5e2e1", fontSize: 12 }}>{a.trigger_reason || "Alert"}</p>
                    <p style={{ margin: 0, color: "#9f9a99", fontSize: 10, textTransform: "uppercase" }}>{a.risk_level} • {a.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{from{opacity:.35}to{opacity:.7}}`}</style>
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div style={{ background: "#1a1a1a", border: "1px solid rgba(91,64,62,0.14)", borderRadius: 4, padding: "8px 10px" }}>
      <p style={{ margin: "0 0 3px", color: "#9f9a99", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <p style={{ margin: 0, color: "#e5e2e1", fontSize: 12, fontFamily: mono ? "monospace" : "Inter" }}>{value}</p>
    </div>
  );
}
