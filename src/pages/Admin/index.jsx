import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { adminBroadcastNotification } from "../../api/notifications";
import { fetchZones } from "../../api/zones";

const C = {
  surface: "#131313",
  surfaceLowest: "#0e0e0e",
  surfaceLow: "#1c1b1b",
  surfaceCard: "#201f1f",
  surfaceHigh: "#2a2a2a",
  surfaceBright: "#3a3939",
  outlineVar: "#5b403e",
  outline: "#ab8986",
  text: "#e5e2e1",
  textMuted: "#e4beba",
  primary: "#ffb3ad",
  primaryStrong: "#ff5451",
  onPrimary: "#68000a",
  secondary: "#ffb95f",
  tertiary: "#4edea3",
};

const FALLBACK_ALERT_BARS = [12, 18, 42, 15, 24, 8, 5];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function initialsOf(name, email = "") {
  const base = String(name || email || "AR").trim();
  if (!base) return "AR";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function roleLabel(role) {
  const r = String(role || "Field Analyst").replace(/_/g, " ");
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function fmtCount(n) {
  return Number(n || 0).toLocaleString();
}

function utcTime(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "--:--:-- UTC";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} UTC`;
}

function bgByLevel(level, idx) {
  if (level === "high") {
    const alpha = [0.4, 0.6, 0.8, 0.9][idx % 4];
    return `rgba(255,84,81,${alpha})`;
  }
  if (level === "med") {
    const alpha = [0.35, 0.5, 0.7][idx % 3];
    return `rgba(255,185,95,${alpha})`;
  }
  const alpha = [0.15, 0.25, 0.4, 0.55][idx % 4];
  return `rgba(78,222,163,${alpha})`;
}

function heatmapTemplate() {
  const pattern = [
    "low", "low", "low", "low", "med", "med", "high", "high", "low", "low", "low", "low",
    "low", "low", "low", "med", "high", "high", "high", "med", "low", "low", "low", "low",
    "low", "low", "low", "low", "med", "med", "low", "low", "low", "low", "low", "low",
    "low", "low", "low", "low", "low", "low", "low", "low", "low", "low", "low", "low",
  ];

  return pattern.map((level, i) => ({ level, pulse: i === 16 || i === 17 }));
}

export default function AdminControlCenter() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [range, setRange] = useState("Last 7 Days");
  const [syncing, setSyncing] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [notifyAudience, setNotifyAudience] = useState("all");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [notifyForm, setNotifyForm] = useState({
    title: "Contract area not detected by ML models",
    message: "Email Kate Wang for users sent a email. Generate assets of contract area which is not detected by ML models and notify users to include it.",
    zone_name: "",
    send_email: true,
    cc_emails: "kate.wang@rockefeller.local",
  });

  const loadData = async () => {
    setError("");
    try {
      const [usersRes, zonesRes, alertsRes] = await Promise.all([
        api.get("/api/users"),
        fetchZones(),
        api.get("/api/alerts"),
      ]);

      setUsers(safeArray(usersRes?.data?.items || usersRes?.data));
      setZones(safeArray(zonesRes?.items || zonesRes));
      setAlerts(safeArray(alertsRes?.data?.items || alertsRes?.data));
    } catch (e) {
      setError(e?.response?.data?.detail || "Unable to load admin panel data.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeUsers = users.length;

  const pendingApprovals = useMemo(
    () =>
      users.filter((u) => {
        const status = String(u?.status || "").toLowerCase();
        return status === "pending" || u?.is_active === false;
      }).length,
    [users],
  );

  const activeAlerts = useMemo(
    () =>
      alerts.filter((a) => {
        const status = String(a?.status || "active").toLowerCase();
        return status !== "resolved" && status !== "closed";
      }).length,
    [alerts],
  );

  const criticalZones = useMemo(
    () => zones.filter((z) => Number(z?.risk_score || 0) >= 70).length,
    [zones],
  );

  const systemHealth = useMemo(() => {
    const penalty = activeAlerts * 0.35 + criticalZones * 0.25;
    const score = Math.max(92, 99.98 - penalty);
    return score.toFixed(2);
  }, [activeAlerts, criticalZones]);

  const weeklyCounts = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    alerts.forEach((a) => {
      const t = new Date(a?.created_at || a?.timestamp || 0);
      if (Number.isNaN(t.getTime())) return;
      const day = (t.getDay() + 6) % 7;
      counts[day] += 1;
    });
    if (!counts.some((v) => v > 0)) return FALLBACK_ALERT_BARS;
    return counts;
  }, [alerts]);

  const recentUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });
    return sorted.slice(0, 3);
  }, [users]);

  const shownUsers = useMemo(() => {
    if (recentUsers.length) {
      return recentUsers.map((u, idx) => ({
        name: u?.full_name || u?.name || "Unknown",
        email: u?.email || "-",
        role: roleLabel(u?.role),
        region: u?.district || "Regional HQ",
        pending: String(u?.status || "").toLowerCase() === "pending" || u?.is_active === false,
        initials: initialsOf(u?.full_name || u?.name || "", u?.email || ""),
        id: u?.id || `${u?.email || idx}`,
      }));
    }

    return [
      {
        name: "Elena Markov",
        email: "e.markov@geosecure.net",
        role: "Field Analyst",
        region: "Swiss Alps",
        pending: true,
        initials: "EM",
        id: "f1",
      },
      {
        name: "James Dalton",
        email: "j.dalton@observer.io",
        role: "Geo Engineer",
        region: "Himalayas",
        pending: false,
        initials: "JD",
        id: "f2",
      },
      {
        name: "Sarah Wei",
        email: "s.wei@globalwatch.org",
        role: "System Admin",
        region: "Regional HQ",
        pending: false,
        initials: "SW",
        id: "f3",
      },
    ];
  }, [recentUsers]);

  const targetableUsers = useMemo(
    () => users.filter((u) => String(u?.role || "") !== "admin"),
    [users],
  );

  const heatCells = useMemo(() => heatmapTemplate(), []);

  const barMax = useMemo(() => Math.max(...weeklyCounts, 1), [weeklyCounts]);

  const auditEntries = useMemo(() => {
    const firstUser = shownUsers[0]?.name || "Elena Markov";
    return [
      {
        tone: C.tertiary,
        time: utcTime(users[0]?.created_at),
        title: "User Approved:",
        message: `${firstUser} verified and assigned to REGION-ALP-04`,
        sub: "Action by Administrator (ID: 0092)",
      },
      {
        tone: C.primary,
        time: utcTime(alerts[0]?.created_at),
        title: "Risk Level Override:",
        message: "Sensor Cluster NODE-882 manually downgraded from CRITICAL to ADVISORY",
        sub: "Verified via Field Visual Confirmation",
      },
      {
        tone: C.secondary,
        time: utcTime(alerts[1]?.created_at),
        title: "System Update:",
        message: "ML Model Sentinel-V4 Hotfix deployed successfully",
        sub: "Automatic Patching Pipeline 2.4.1",
      },
      {
        tone: C.outline,
        time: utcTime(users[1]?.last_login),
        title: "Access Granted:",
        message: "Regional Director login from IP: 192.168.1.104",
        sub: "Multi-factor authentication successful",
      },
    ];
  }, [alerts, shownUsers, users]);

  const handleSync = async () => {
    setSyncing(true);
    await loadData();
    setSyncing(false);
    setNotice(`System sync completed at ${utcTime(new Date())}`);
  };

  const toggleSelectedUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleNotifySubmit = async (e) => {
    e.preventDefault();
    if (!notifyForm.title.trim() || !notifyForm.message.trim()) {
      setError("Notification title and message are required.");
      return;
    }
    if (notifyAudience === "selected" && selectedUserIds.length === 0) {
      setError("Select at least one user or switch audience to all.");
      return;
    }

    setSendingNotify(true);
    setError("");
    try {
      const ccList = String(notifyForm.cc_emails || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      const res = await adminBroadcastNotification({
        title: notifyForm.title.trim(),
        message: notifyForm.message.trim(),
        audience: notifyAudience,
        user_ids: notifyAudience === "selected" ? selectedUserIds : [],
        zone_name: notifyForm.zone_name.trim() || null,
        send_email: !!notifyForm.send_email,
        cc_emails: ccList,
        notification_type: "warning",
      });

      setNotice(
        `Broadcast sent: ${res.notified || 0} in-app, ${res.emailed || 0} emails` +
          (res.failed_email ? `, ${res.failed_email} email failures` : ""),
      );
      setNotifyOpen(false);
      setSelectedUserIds([]);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to send admin notification.");
    } finally {
      setSendingNotify(false);
    }
  };

  return (
    <div style={{ minHeight: "100%", fontFamily: "Inter, sans-serif", color: C.text, background: C.surface }}>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .pulse-error {
          box-shadow: 0 0 12px #EF4444;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "1px solid rgba(91,64,62,0.15)",
            paddingBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 900,
                background: "linear-gradient(135deg,#FFB3AD,#FF5451)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Admin Control Center
            </span>
            <div style={{ height: 16, width: 1, background: "rgba(91,64,62,0.3)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>lock</span>
              Secure Session
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate("/alerts")} style={iconBtnStyle}><span className="material-symbols-outlined">notifications</span></button>
            <button onClick={() => navigate("/profile")} style={iconBtnStyle}><span className="material-symbols-outlined">settings</span></button>
            <button onClick={() => navigate("/reports")} style={iconBtnStyle}><span className="material-symbols-outlined">help</span></button>
          </div>
        </div>

        {error ? (
          <div style={{ background: "rgba(147,0,10,0.22)", border: "1px solid rgba(255,84,81,0.3)", color: "#ffdad6", padding: "10px 12px", borderRadius: 4, fontSize: 12 }}>
            {error}
          </div>
        ) : null}

        {!!notice && (
          <div style={{ background: "rgba(255,179,173,0.12)", border: "1px solid rgba(255,179,173,0.25)", color: C.primary, padding: "10px 12px", borderRadius: 4, fontSize: 12 }}>
            {notice}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 24 }}>
          <div style={{ background: C.surfaceCard, padding: 24, borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, padding: 8, opacity: 0.1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40 }}>dns</span>
            </div>
            <p style={kpiLabelStyle}>System Health</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: C.tertiary }}>{systemHealth}%</span>
              <span style={{ fontSize: 10, color: "rgba(78,222,163,0.7)", textTransform: "uppercase" }}>Optimal</span>
            </div>
            <div style={{ marginTop: 16, width: "100%", background: C.surfaceLowest, height: 4 }}>
              <div style={{ background: C.tertiary, height: "100%", width: `${Math.min(100, Number(systemHealth))}%` }} />
            </div>
          </div>

          <button onClick={() => navigate("/profile")} style={kpiCardButtonStyle}>
            <p style={kpiLabelStyle}>Active Users</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 700 }}>{fmtCount(activeUsers)}</span>
              <span style={{ fontSize: 10, color: C.primary, textTransform: "uppercase" }}>+12%</span>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 10, color: C.textMuted }}>Across {Math.max(1, zones.length)} monitoring zones</p>
          </button>

          <button onClick={() => navigate("/profile")} style={kpiCardButtonStyle}>
            <p style={kpiLabelStyle}>Pending Approvals</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: C.secondary }}>{pendingApprovals}</span>
              <span className="material-symbols-outlined" style={{ color: C.secondary, fontSize: 16 }}>pending_actions</span>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 10, color: C.textMuted }}>{criticalZones} critical field zones</p>
          </button>

          <button onClick={() => navigate("/predictions")} style={{ ...kpiCardButtonStyle, background: C.surfaceHigh, borderLeft: `2px solid ${C.primary}` }}>
            <p style={kpiLabelStyle}>ML Model Status</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: C.primary }}>STABLE</span>
              <span className="material-symbols-outlined pulse-error" style={{ color: C.primary, fontSize: 16 }}>bolt</span>
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 10, color: C.textMuted }}>Sentinel-V4 Active</p>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 32 }}>
          <div style={{ background: C.surfaceCard, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(42,42,42,0.5)" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Recent User Registrations</h3>
              <button onClick={() => navigate("/profile")} style={actionTextButtonStyle}>View All</button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.surfaceLow, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: C.textMuted }}>
                    <th style={{ padding: "12px 24px", fontWeight: 500 }}>User</th>
                    <th style={{ padding: "12px 24px", fontWeight: 500 }}>Role</th>
                    <th style={{ padding: "12px 24px", fontWeight: 500 }}>Region</th>
                    <th style={{ padding: "12px 24px", fontWeight: 500 }}>Status</th>
                    <th style={{ padding: "12px 24px", fontWeight: 500 }}>Action</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: 14 }}>
                  {shownUsers.map((u, idx) => (
                    <tr key={u.id} style={{ background: idx % 2 === 0 ? C.surfaceLow : C.surfaceCard }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 2, background: "#353534", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                            {u.initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 10, color: C.textMuted }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px", fontSize: 12, fontFamily: "monospace" }}>{u.role}</td>
                      <td style={{ padding: "16px 24px", fontSize: 12 }}>{u.region}</td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 2, background: u.pending ? "rgba(255,185,95,0.1)" : "rgba(78,222,163,0.1)", color: u.pending ? C.secondary : C.tertiary, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                          {u.pending ? "Pending" : "Verified"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <button onClick={() => navigate("/profile")} style={iconBtnStyle}>
                          <span className="material-symbols-outlined" style={{ color: u.pending ? C.primary : C.textMuted, fontSize: 18 }}>
                            {u.pending ? "verified_user" : "more_horiz"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
            {[
              { icon: "admin_panel_settings", color: C.primary, title: "Admin Panel", sub: "Global Config", onClick: () => navigate("/admin") },
              { icon: "analytics", color: C.tertiary, title: "Analytics", sub: "Full Reports", onClick: () => navigate("/analytics") },
              { icon: "group", color: C.secondary, title: "Users", sub: "Access Control", onClick: () => navigate("/profile") },
              { icon: "history_edu", color: C.textMuted, title: "Audit Logs", sub: "System History", onClick: () => setNotice("Audit log module is active below.") },
            ].map((tile) => (
              <button
                key={tile.title}
                onClick={tile.onClick}
                style={{
                  border: "none",
                  background: C.surfaceCard,
                  padding: 16,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  textAlign: "left",
                  cursor: "pointer",
                  color: C.text,
                  minHeight: 108,
                }}
              >
                <span className="material-symbols-outlined" style={{ color: tile.color, marginBottom: 8 }}>{tile.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>{tile.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: C.textMuted }}>{tile.sub}</p>
                </div>
              </button>
            ))}

            <div style={{ gridColumn: "1 / span 2", background: "linear-gradient(135deg, rgba(255,179,173,0.1), rgba(0,0,0,0))", padding: 16, borderLeft: `2px solid ${C.primary}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>System Backup</p>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textMuted }}>
                  {syncing ? "Sync in progress..." : "Last backup: 22m ago"}
                </p>
              </div>
              <button onClick={handleSync} style={{ border: "none", background: C.primary, color: C.onPrimary, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", padding: "6px 12px", borderRadius: 2, cursor: "pointer" }}>
                {syncing ? "Syncing" : "Sync Now"}
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div style={{ background: C.surfaceCard, padding: 24, borderRadius: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>Risk Exposure Heatmap</h3>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Global Monitoring Nodes
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: C.primary }} /><span style={{ fontSize: 8, textTransform: "uppercase" }}>High</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: C.secondary }} /><span style={{ fontSize: 8, textTransform: "uppercase" }}>Med</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 8, height: 8, background: C.tertiary }} /><span style={{ fontSize: 8, textTransform: "uppercase" }}>Low</span></div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 4 }}>
              {heatCells.map((cell, idx) => (
                <button
                  key={`heat-${idx}`}
                  className={cell.pulse ? "pulse-error" : ""}
                  onClick={() => setNotice(`Heatmap node ${idx + 1} selected.`)}
                  style={{ aspectRatio: "1 / 1", borderRadius: 2, background: bgByLevel(cell.level, idx), border: "none", cursor: "pointer" }}
                />
              ))}
            </div>
          </div>

          <div style={{ background: C.surfaceCard, padding: 24, borderRadius: 2 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>7-Day Alert Volume</h3>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Metric: Frequency / 24h
                </p>
              </div>
              <select value={range} onChange={(e) => setRange(e.target.value)} style={{ background: C.surfaceHigh, border: "none", color: C.textMuted, fontSize: 10, textTransform: "uppercase", fontWeight: 700, borderRadius: 2, padding: "6px 8px", outline: "none", cursor: "pointer" }}>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 128, gap: 8, paddingLeft: 8, paddingRight: 8 }}>
              {weeklyCounts.map((count, idx) => {
                const h = Math.max(8, Math.round((count / barMax) * 128));
                const bg = idx === 2 ? "rgba(255,179,173,0.6)" : idx === 4 ? "rgba(255,185,95,0.6)" : "rgba(91,64,62,0.2)";
                return (
                  <button key={DAY_LABELS[idx]} onClick={() => setNotice(`${DAY_LABELS[idx]} alerts: ${count}`)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", color: C.text }}>
                    <div style={{ width: "100%", background: bg, height: h, borderTopLeftRadius: 2, borderTopRightRadius: 2, position: "relative" }}>
                      <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 8, background: C.surfaceBright, padding: "2px 4px" }}>{count}</div>
                    </div>
                    <span style={{ fontSize: 8, textTransform: "uppercase", color: C.textMuted }}>{DAY_LABELS[idx]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ background: C.surfaceCard, borderRadius: 2, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span className="material-symbols-outlined" style={{ color: C.primary }}>security</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>System Security Audit Log</h3>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, background: C.tertiary, borderRadius: "50%" }} />
              <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700, color: C.textMuted }}>Live Stream Active</span>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {auditEntries.map((entry, idx) => (
              <button
                key={`log-${idx}`}
                onClick={() => setNotice(`Audit entry opened: ${entry.title.replace(":", "")}`)}
                style={{ display: "flex", gap: 16, alignItems: "flex-start", border: "none", background: "transparent", borderLeft: "1px solid rgba(91,64,62,0.3)", paddingLeft: 16, position: "relative", textAlign: "left", color: C.text, cursor: "pointer" }}
              >
                <div style={{ position: "absolute", left: -6, top: 6, width: 12, height: 12, borderRadius: "50%", background: entry.tone, boxShadow: `0 0 0 4px ${C.surfaceCard}` }} />
                <div style={{ minWidth: 120, fontSize: 10, fontFamily: "monospace", color: C.textMuted, paddingTop: 2 }}>{entry.time}</div>
                <div>
                  <p style={{ margin: 0, fontSize: 12 }}>
                    <span style={{ color: entry.tone, fontWeight: 700 }}>{entry.title}</span>{" "}
                    {entry.message}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 10, color: C.textMuted }}>{entry.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => setNotifyOpen(true)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 60,
          border: "none",
          borderRadius: 20,
          padding: "10px 14px",
          background: C.primary,
          color: C.onPrimary,
          fontSize: 11,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
          cursor: "pointer",
          boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>campaign</span>
        Notify Users
      </button>

      {notifyOpen ? (
        <div
          onClick={() => !sendingNotify && setNotifyOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 70,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            padding: 16,
          }}
        >
          <form
            onSubmit={handleNotifySubmit}
            onClick={(evt) => evt.stopPropagation()}
            style={{
              width: "min(460px, calc(100vw - 24px))",
              maxHeight: "88vh",
              overflowY: "auto",
              background: C.surfaceCard,
              border: "1px solid rgba(91,64,62,0.5)",
              borderRadius: 6,
              padding: 14,
              color: C.text,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: C.primary }}>
                Admin User Notification
              </div>
              <button
                type="button"
                onClick={() => setNotifyOpen(false)}
                style={{ ...iconBtnStyle, color: C.textMuted }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <label style={modalLabelStyle}>Audience</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { value: "all", label: "All Users" },
                { value: "selected", label: "Selected Users" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setNotifyAudience(option.value)}
                  style={{
                    border: "1px solid rgba(91,64,62,0.5)",
                    background: notifyAudience === option.value ? "rgba(255,179,173,0.2)" : C.surfaceLow,
                    color: notifyAudience === option.value ? C.primary : C.textMuted,
                    borderRadius: 4,
                    padding: "6px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {notifyAudience === "selected" ? (
              <div style={{ border: "1px solid rgba(91,64,62,0.4)", borderRadius: 4, padding: 8, maxHeight: 120, overflowY: "auto", marginBottom: 10 }}>
                {targetableUsers.length === 0 ? (
                  <div style={{ fontSize: 11, color: C.textMuted }}>No users available.</div>
                ) : (
                  targetableUsers.map((u) => {
                    const id = String(u.id || "");
                    const checked = selectedUserIds.includes(id);
                    return (
                      <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, marginBottom: 6, cursor: "pointer" }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelectedUser(id)} />
                        <span>{u.name || "User"} ({u.email || "no-email"})</span>
                      </label>
                    );
                  })
                )}
              </div>
            ) : null}

            <label style={modalLabelStyle}>Subject</label>
            <input
              value={notifyForm.title}
              onChange={(e) => setNotifyForm((prev) => ({ ...prev, title: e.target.value }))}
              style={modalInputStyle}
              maxLength={140}
            />

            <label style={modalLabelStyle}>Contract / Zone Name (optional)</label>
            <input
              value={notifyForm.zone_name}
              onChange={(e) => setNotifyForm((prev) => ({ ...prev, zone_name: e.target.value }))}
              style={modalInputStyle}
              placeholder="e.g., Contract Area C-17"
            />

            <label style={modalLabelStyle}>Message</label>
            <textarea
              value={notifyForm.message}
              onChange={(e) => setNotifyForm((prev) => ({ ...prev, message: e.target.value }))}
              style={{ ...modalInputStyle, minHeight: 94, resize: "vertical" }}
              maxLength={5000}
            />

            <label style={{ ...modalLabelStyle, marginTop: 2 }}>
              <input
                type="checkbox"
                checked={notifyForm.send_email}
                onChange={(e) => setNotifyForm((prev) => ({ ...prev, send_email: e.target.checked }))}
                style={{ marginRight: 8 }}
              />
              Send Email Also
            </label>

            {notifyForm.send_email ? (
              <>
                <label style={modalLabelStyle}>CC Emails (comma separated)</label>
                <input
                  value={notifyForm.cc_emails}
                  onChange={(e) => setNotifyForm((prev) => ({ ...prev, cc_emails: e.target.value }))}
                  style={modalInputStyle}
                  placeholder="kate.wang@rockefeller.local"
                />
              </>
            ) : null}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setNotifyOpen(false)} style={modalGhostBtnStyle} disabled={sendingNotify}>Cancel</button>
              <button type="submit" style={modalSendBtnStyle} disabled={sendingNotify}>
                {sendingNotify ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const iconBtnStyle = {
  border: "none",
  background: "transparent",
  color: C.textMuted,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

const kpiLabelStyle = {
  margin: 0,
  fontWeight: 300,
  letterSpacing: "0.1em",
  fontSize: "0.6875rem",
  textTransform: "uppercase",
  color: C.textMuted,
};

const kpiCardButtonStyle = {
  border: "none",
  background: C.surfaceCard,
  padding: 24,
  borderRadius: 2,
  position: "relative",
  overflow: "hidden",
  textAlign: "left",
  color: C.text,
  cursor: "pointer",
};

const actionTextButtonStyle = {
  border: "none",
  background: "transparent",
  color: C.primary,
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  cursor: "pointer",
};

const modalLabelStyle = {
  fontSize: 10,
  color: C.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 4,
  display: "block",
};

const modalInputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(91,64,62,0.45)",
  background: C.surfaceLow,
  color: C.text,
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 12,
  marginBottom: 10,
  outline: "none",
};

const modalGhostBtnStyle = {
  border: "1px solid rgba(91,64,62,0.6)",
  background: C.surfaceLow,
  color: C.textMuted,
  borderRadius: 4,
  padding: "7px 12px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

const modalSendBtnStyle = {
  border: "none",
  background: C.primary,
  color: C.onPrimary,
  borderRadius: 4,
  padding: "7px 12px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
