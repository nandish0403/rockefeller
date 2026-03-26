import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Snackbar } from "@mui/material";
import api from "../../api/axios";
import { fetchZones } from "../../api/zones";
import Skeleton from "react-loading-skeleton";
import AnimatedNumber from "../../components/common/AnimatedNumber";

// ── helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 2)   return "Yesterday";
  return `${d}d ago`;
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
}

const ROLE_CFG = {
  admin:          { color: "#ff5451", bg: "rgba(255,84,81,0.1)",   label: "Admin"          },
  safety_officer: { color: "#ffb95f", bg: "rgba(255,185,95,0.1)",  label: "Safety Officer" },
  field_worker:   { color: "#4edea3", bg: "rgba(78,222,163,0.1)",  label: "Field Worker"   },
};

const TABS = ["Overview", "Operations", "Logs"];

const EMPTY_FORM = { name: "", email: "", password: "",
  role: "field_worker", district: "", zone_assigned: "" };

// ══════════════════════════════════════════════════════════════
export default function AdminPage() {
  const navigate   = useNavigate();
  const [mounted,  setMounted]  = useState(false);
  const [tab,      setTab]      = useState(0);
  const [users,    setUsers]    = useState([]);
  const [zones,    setZones]    = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [pendingCracks, setPendingCracks] = useState([]);
  const [crackActionLoading, setCrackActionLoading] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Users table state
  const [userQ,    setUserQ]    = useState("");
  const [userRole, setUserRole] = useState("All");
  const [userPage, setUserPage] = useState(1);
  const PER_PAGE = 8;

  // Menu
  const [menuUser, setMenuUser] = useState(null);
  const menuRef = useRef(null);

  // Modal
  const [modal,    setModal]    = useState(null); // null | "add" | "edit" | "delete"
  const [editing,  setEditing]  = useState(null); // user object
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: usersData }, zoneList, { data: alertData }, { data: crackData }] = await Promise.all([
        api.get("/api/users"),
        fetchZones().catch(() => []),
        api.get("/api/alerts").catch(() => ({ data: [] })),
        api.get("/api/crack-reports", { params: { status: "pending" } }).catch(() => ({ data: [] })),
      ]);
      setUsers(usersData ?? []);
      setZones(zoneList  ?? []);
      setAlerts(alertData ?? []);
      setPendingCracks(crackData ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  // close menu on outside click
  useEffect(() => {
    const h = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuUser(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── KPIs ──
  const totalZones = zones.length;
  const critZones = zones.filter(z => z.risk_level === "red").length;
  const totalUsers = users.length;
  const onlineWorkers = users.filter(u => u.role === "field_worker" && u.last_login &&
      (Date.now() - new Date(u.last_login)) < 3600000).length;


  // ── Filtered users ──
  const filteredUsers = users
    .filter(u => {
      if (userRole !== "All" && u.role !== userRole) return false;
      if (userQ) {
        const q = userQ.toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
          || u.district?.toLowerCase().includes(q);
      }
      return true;
    });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const pageUsers  = filteredUsers.slice((userPage - 1) * PER_PAGE, userPage * PER_PAGE);

  // ── CRUD ──
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModal("add");
  };
  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email, password: "",
      role: u.role, district: u.district ?? "",
      zone_assigned: u.zone_assigned ?? "" });
    setEditing(u);
    setMenuUser(null);
    setModal("edit");
  };
  const openDelete = (u) => {
    setEditing(u);
    setMenuUser(null);
    setModal("delete");
  };

  const submitUser = async () => {
    setSaving(true);
    try {
      if (modal === "add") {
        await api.post("/api/users", form);
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await api.patch(`/api/users/${editing.id}`, payload);
      }
      await load();
      setModal(null);
    } catch { /* toast */ }
    finally { setSaving(false); }
  };

  const deleteUser = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/users/${editing.id}`);
      await load();
      setModal(null);
    } catch { /* toast */ }
    finally { setDeleting(false); }
  };

  const handleVerifyCrack = async (reportId) => {
    const ids = Array.isArray(reportId)
      ? reportId.map((v) => String(v).trim()).filter(Boolean)
      : String(reportId ?? "").split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
    if (ids.length !== 1) {
      setSnackbar({ type: "error", message: "Please verify one crack report at a time." });
      return;
    }

    const safeId = ids[0];
    setCrackActionLoading(`${safeId}:verify`);
    try {
      await api.patch(`/api/crack-reports/${encodeURIComponent(safeId)}/verify`);
      setPendingCracks((prev) => prev.filter((r) => r.id !== safeId));
      setSnackbar({ type: "success", message: "Crack report verified and alert sent." });
    } catch {
      setSnackbar({ type: "error", message: "Failed to verify crack report." });
    } finally {
      setCrackActionLoading(null);
    }
  };

  const handleRejectCrack = async (reportId) => {
    const ids = Array.isArray(reportId)
      ? reportId.map((v) => String(v).trim()).filter(Boolean)
      : String(reportId ?? "").split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
    if (ids.length !== 1) {
      setSnackbar({ type: "error", message: "Please reject one crack report at a time." });
      return;
    }

    const safeId = ids[0];
    setCrackActionLoading(`${safeId}:reject`);
    try {
      await api.patch(`/api/crack-reports/${encodeURIComponent(safeId)}/reject`);
      setPendingCracks((prev) => prev.filter((r) => r.id !== safeId));
      setSnackbar({ type: "success", message: "Crack report rejected and submitter notified." });
    } catch {
      setSnackbar({ type: "error", message: "Failed to reject crack report." });
    } finally {
      setCrackActionLoading(null);
    }
  };

  // system stats
  const dataSyncPct  = 98;
  const activeAlerts = alerts.filter(a => a.status === "active").length;

  return (
    <div style={{
      padding: "28px 32px 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}
      onClick={() => setMenuUser(null)}
    >
      {/* ── Tab bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 24, marginBottom: 28,
        borderBottom: "1px solid rgba(91,64,62,0.12)",
        animation: "adSlideDown 0.35s ease both",
      }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{
            background: "none", border: "none", cursor: "pointer",
            fontFamily: "Inter", fontSize: 10, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: "0.14em",
            color: tab === i ? "#ffb3ad" : "#e4beba",
            paddingBottom: 12, marginBottom: -1,
            borderBottom: `2px solid ${tab === i ? "#ffb3ad" : "transparent"}`,
            transition: "all 0.2s",
          }}>{t}</button>
        ))}
      </div>

      {/* ════════ OVERVIEW TAB ════════ */}
      {tab === 0 && (
        <div style={{ animation: "adFadeUp 0.35s ease both" }}>

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            gap: 16, marginBottom: 28 }}>
            {[
              { label: "Total Monitored Zones", val: totalZones,
                sub: "+4.2%", subColor: "#4edea3",        icon: "layers"       },
              { label: "Critical Red Zones",    val: critZones,
                valColor: "#ff5451", pulseDot: true,       icon: "crisis_alert" },
              { label: "Registered Users",      val: totalUsers,
                icon: "group"                                                    },
              { label: "Field Workers Online",  val: onlineWorkers,
                valColor: "#4edea3", badge: "Active",      icon: "sensors"      },
            ].map(({ label, val, sub, subColor, valColor, pulseDot, badge, icon }, i) => (
              <div key={label} style={{
                background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: 20,
                position: "relative", overflow: "hidden",
                animation: `adFadeUp 0.4s ease ${i * 0.07}s both`,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span className="material-symbols-outlined" style={{
                  position: "absolute", top: 10, right: 10, fontSize: 28,
                  color: valColor ?? "#ffb3ad", opacity: 0.07,
                  fontVariationSettings: "'FILL' 1",
                }}>{icon}</span>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  textTransform: "uppercase", letterSpacing: "0.14em",
                  margin: "0 0 14px" }}>{label}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {loading ? (
                    <Skeleton height={44} width={64} />
                  ) : (
                    <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1,
                      color: valColor ?? "#e5e2e1" }}>
                      {typeof val === "number"
                        ? <AnimatedNumber value={val} duration={1} />
                        : val}
                    </span>
                  )}
                  {pulseDot && !loading && (
                    <span style={{ width: 8, height: 8, borderRadius: "50%",
                      background: "#ff5451",
                      boxShadow: "0 0 12px #ff5451",
                      animation: "adPulse 2s ease infinite" }} />
                  )}
                  {badge && !loading && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#4edea3",
                      background: "rgba(78,222,163,0.1)", borderRadius: 2,
                      padding: "3px 8px", textTransform: "uppercase",
                      letterSpacing: "0.1em" }}>{badge}</span>
                  )}
                </div>
                {sub && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: subColor,
                    display: "flex", alignItems: "center", gap: 3, marginTop: 6 }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 13 }}>trending_up</span>
                    {sub}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(42,42,42,0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(91,64,62,0.15)",
            borderRadius: 4,
            padding: "18px 20px",
            marginBottom: 24,
            animation: "adFadeUp 0.4s ease 0.08s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <SectionTitle>Pending Crack Reports</SectionTitle>
              <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.6 }}>
                {pendingCracks.length} pending
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(91,64,62,0.15)" }}>
                    {["Zone", "Crack Type", "Severity", "Submitted By", "Submitted", "Photo", "Actions"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 9, color: "#e4beba", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingCracks.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "16px 10px", color: "#9f9a99", fontSize: 12 }}>
                        No pending crack reports.
                      </td>
                    </tr>
                  )}
                  {pendingCracks.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid rgba(91,64,62,0.08)" }}>
                      <td style={{ padding: "10px", color: "#e5e2e1", fontSize: 12 }}>{row.zone_name || "-"}</td>
                      <td style={{ padding: "10px", color: "#e4beba", fontSize: 11 }}>{(row.crack_type || "-").replace(/_/g, " ")}</td>
                      <td style={{ padding: "10px" }}>
                        <span style={{
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: row.severity === "critical" ? "#ff5451" : row.severity === "high" ? "#ffb95f" : "#4edea3",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: 2,
                          padding: "3px 7px",
                        }}>
                          {row.severity || "low"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "#e5e2e1", fontSize: 11 }}>{row.reported_by || "-"}</td>
                      <td style={{ padding: "10px", color: "#9f9a99", fontSize: 10 }}>{timeAgo(row.created_at)}</td>
                      <td style={{ padding: "10px" }}>
                        {row.photo_url ? (
                          <img src={row.photo_url} alt="crack" style={{ width: 44, height: 32, objectFit: "cover", borderRadius: 2 }} />
                        ) : (
                          <span style={{ color: "#777", fontSize: 10 }}>No photo</span>
                        )}
                      </td>
                      <td style={{ padding: "10px", display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleVerifyCrack(row.id)}
                          disabled={crackActionLoading === `${row.id}:verify`}
                          style={{
                            background: "rgba(78,222,163,0.16)",
                            color: "#4edea3",
                            border: "1px solid rgba(78,222,163,0.4)",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "6px 10px",
                            cursor: "pointer",
                          }}
                        >
                          {crackActionLoading === `${row.id}:verify` ? "Verifying..." : "Verify"}
                        </button>
                        <button
                          onClick={() => handleRejectCrack(row.id)}
                          disabled={crackActionLoading === `${row.id}:reject`}
                          style={{
                            background: "rgba(255,84,81,0.14)",
                            color: "#ff5451",
                            border: "1px solid rgba(255,84,81,0.4)",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "6px 10px",
                            cursor: "pointer",
                          }}
                        >
                          {crackActionLoading === `${row.id}:reject` ? "Rejecting..." : "Reject"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Main grid: System Overview + Users ── */}
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>

            {/* System Overview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <SectionTitle>System Overview</SectionTitle>

              {[
                { label: "Model Version", val: "v4.2.0",
                  badge: { text: "Stable", color: "#4edea3" }, icon: "terminal" },
                { label: "Last ML Run",   val: "2m ago",
                  icon: "psychology", custom: (
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
                      {[3,5,2,7,4].map((h,i) => (
                        <div key={i} style={{
                          width: 4, height: h * 3,
                          background: "#4edea3",
                          opacity: 0.4 + i * 0.12,
                          borderRadius: 2,
                          animation: `adBarBounce 0.8s ease ${i * 0.1}s infinite alternate`,
                        }} />
                      ))}
                    </div>
                  )},
                { label: "Active Alerts",  val: loading ? "—" : activeAlerts,
                  valColor: activeAlerts > 0 ? "#ff5451" : "#4edea3",
                  icon: "notifications_active" },
              ].map(({ label, val, badge, icon, custom, valColor }, i) => (
                <div key={label} style={{
                  background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                  border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: 18,
                  transition: "background 0.2s",
                  animation: `adFadeUp 0.4s ease ${0.1 + i * 0.07}s both`,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(58,57,57,0.6)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(42,42,42,0.6)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                      opacity: 0.5, textTransform: "uppercase",
                      letterSpacing: "0.12em" }}>{label}</span>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 15, color: "#ffb3ad", opacity: 0.35 }}>{icon}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center" }}>
                    <span style={{ fontSize: 20, fontWeight: 700,
                      color: valColor ?? "#e5e2e1" }}>{val}</span>
                    {badge && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: badge.color,
                        background: `${badge.color}18`, borderRadius: 2,
                        padding: "3px 8px", textTransform: "uppercase",
                        letterSpacing: "0.08em" }}>{badge.text}</span>
                    )}
                    {custom}
                  </div>
                </div>
              ))}

              {/* Data Sync bar */}
              <div style={{
                background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: 18,
                animation: "adFadeUp 0.4s ease 0.3s both",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                    opacity: 0.5, textTransform: "uppercase",
                    letterSpacing: "0.12em" }}>Data Sync</span>
                  <span className="material-symbols-outlined"
                    style={{ fontSize: 15, color: "#ffb3ad", opacity: 0.35 }}>cloud_sync</span>
                </div>
                <div style={{ display: "flex", alignItems: "center",
                  gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700,
                    color: "#e5e2e1" }}>{dataSyncPct}%</span>
                </div>
                <div style={{ height: 4, background: "#1c1b1b",
                  borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{
                    height: "100%", width: `${dataSyncPct}%`,
                    background: "linear-gradient(90deg,#ffb3ad,#4edea3)",
                    borderRadius: 99,
                    animation: "adSyncBar 1s ease 0.5s both",
                  }} />
                </div>
                <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.4,
                  fontStyle: "italic" }}>All 4,200+ sensors reporting</p>
              </div>

              {/* Risk vector mini chart */}
              <div style={{
                background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4,
                height: 120, position: "relative", overflow: "hidden",
                display: "flex", flexDirection: "column", justifyContent: "flex-end",
                animation: "adFadeUp 0.4s ease 0.35s both",
              }}>
                <div style={{ padding: "12px 14px 0",
                  position: "absolute", top: 0, left: 0, right: 0,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                    opacity: 0.4, textTransform: "uppercase",
                    letterSpacing: "0.12em" }}>Risk Vector</span>
                  <span className="material-symbols-outlined"
                    style={{ fontSize: 15, color: "#ffb3ad", opacity: 0.2 }}>
                    query_stats
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end",
                  padding: "0 10px 10px", gap: 3, height: 80 }}>
                  {[30, 50, 65, 80, 55, 90, 45, 70].map((h, i) => (
                    <div key={i} style={{ flex: 1,
                      height: `${h}%`,
                      background: h > 75 ? "rgba(255,84,81,0.5)"
                        : h > 55 ? "rgba(255,179,173,0.35)"
                        : "rgba(255,179,173,0.2)",
                      borderRadius: "2px 2px 0 0",
                      animation: `adBarGrow 0.6s ease ${i * 0.06}s both`,
                    }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Users management */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header + search */}
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
                <SectionTitle>Users Management</SectionTitle>
                <div style={{ display: "flex", gap: 10, alignItems: "center",
                  flexWrap: "wrap" }}>
                  {/* Search */}
                  <div style={{ position: "relative" }}>
                    <span className="material-symbols-outlined" style={{
                      position: "absolute", left: 9, top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 15, color: "#e4beba", opacity: 0.4,
                      pointerEvents: "none",
                    }}>search</span>
                    <input value={userQ} onChange={e => { setUserQ(e.target.value); setUserPage(1); }}
                      placeholder="Search users…"
                      style={{
                        background: "#2a2a2a", border: "1px solid rgba(91,64,62,0.2)",
                        borderRadius: 2, padding: "7px 10px 7px 30px",
                        color: "#e5e2e1", fontSize: 11, fontFamily: "Inter",
                        outline: "none", width: 170, transition: "border-color 0.2s",
                      }}
                      onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.35)"}
                      onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.2)"}
                    />
                  </div>
                  {/* Role filter */}
                  <div style={{ position: "relative" }}>
                    <select value={userRole}
                      onChange={e => { setUserRole(e.target.value); setUserPage(1); }} style={{
                        background: "#2a2a2a", border: "1px solid rgba(91,64,62,0.2)",
                        borderRadius: 2, padding: "7px 26px 7px 10px",
                        color: "#e5e2e1", fontSize: 11, fontFamily: "Inter",
                        outline: "none", appearance: "none", cursor: "pointer",
                        minWidth: 130,
                      }}>
                      <option value="All">All Roles</option>
                      <option value="admin">Admin</option>
                      <option value="safety_officer">Safety Officer</option>
                      <option value="field_worker">Field Worker</option>
                    </select>
                    <span className="material-symbols-outlined" style={{
                      position: "absolute", right: 6, top: "50%",
                      transform: "translateY(-50%)", fontSize: 14,
                      color: "#e4beba", pointerEvents: "none",
                    }}>expand_more</span>
                  </div>
                  {/* Add user */}
                  <button onClick={openAdd} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                    border: "none", borderRadius: 2, padding: "8px 16px",
                    color: "#68000a", fontSize: 9, fontWeight: 800,
                    fontFamily: "Inter", textTransform: "uppercase",
                    letterSpacing: "0.12em", cursor: "pointer",
                    transition: "all 0.2s", boxShadow: "0 4px 16px rgba(255,84,81,0.2)",
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 15 }}>person_add</span>
                    Add User
                  </button>
                </div>
              </div>

              {/* Users table */}
              <div style={{
                background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4,
                overflow: "hidden", animation: "adFadeUp 0.4s ease 0.1s both",
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(28,27,27,0.5)",
                      borderBottom: "1px solid rgba(91,64,62,0.1)" }}>
                      {["Name & Email", "District", "Role", "Last Active", ""].map((h, j) => (
                        <th key={h + j} style={{
                          padding: "12px 18px", textAlign: j === 4 ? "right" : "left",
                          fontSize: 9, fontWeight: 700, color: "#e4beba",
                          opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.14em",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array(4).fill(null).map((_, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(91,64,62,0.05)" }}>
                          {[1,2,3,4,5].map(j => (
                            <td key={j} style={{ padding: "14px 18px" }}>
                              <div style={{ height: 12, background: "#3a3939",
                                borderRadius: 2, width: j === 4 ? 20 : "80%",
                                animation: "adShimmer 1.4s ease infinite alternate" }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : pageUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "32px 18px",
                          textAlign: "center", fontSize: 11, color: "#5b403e" }}>
                          No users match your filters
                        </td>
                      </tr>
                    ) : pageUsers.map((u, i) => (
                      <UserRow key={u.id ?? i} user={u} idx={i}
                        menuUser={menuUser} setMenuUser={setMenuUser}
                        menuRef={menuRef}
                        onEdit={() => openEdit(u)}
                        onDelete={() => openDelete(u)}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={{
                  padding: "12px 18px",
                  background: "rgba(28,27,27,0.3)",
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid rgba(91,64,62,0.08)",
                }}>
                  <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.4 }}>
                    Showing {Math.min((userPage - 1) * PER_PAGE + 1, filteredUsers.length)}
                    –{Math.min(userPage * PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setUserPage(p)} style={{
                        width: 28, height: 28, borderRadius: 2,
                        background: userPage === p ? "rgba(255,179,173,0.15)" : "transparent",
                        border: `1px solid ${userPage === p ? "rgba(255,179,173,0.3)" : "rgba(91,64,62,0.15)"}`,
                        color: userPage === p ? "#ffb3ad" : "#e4beba",
                        fontSize: 10, fontWeight: 700, cursor: "pointer",
                        fontFamily: "Inter", transition: "all 0.2s",
                      }}>{p}</button>
                    ))}
                    {totalPages > 5 && (
                      <span style={{ fontSize: 10, color: "#e4beba",
                        opacity: 0.4, alignSelf: "center" }}>…</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Regional threat map */}
              <div style={{
                background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
                border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4,
                padding: 20, animation: "adFadeUp 0.4s ease 0.2s both",
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  opacity: 0.5, textTransform: "uppercase",
                  letterSpacing: "0.14em", display: "block", marginBottom: 12 }}>
                  Zone Risk Spread
                </span>
                <div style={{ height: 80, display: "flex",
                  alignItems: "flex-end", gap: 4, marginBottom: 8 }}>
                  {zones.slice(0, 16).map((z, i) => {
                    const h = Math.round((z.risk_score ?? 0) * 100);
                    const col = z.risk_level === "red" ? "#ff5451"
                      : z.risk_level === "orange" ? "#ffb95f"
                      : z.risk_level === "yellow" ? "#ffeb3b"
                      : "#4edea3";
                    return (
                      <div key={i} style={{ flex: 1, position: "relative" }}>
                        <div style={{
                          width: "100%", height: `${Math.max(h, 8)}%`,
                          background: col, borderRadius: "2px 2px 0 0",
                          opacity: 0.7,
                          boxShadow: z.risk_level === "red" ? `0 0 6px ${col}` : "none",
                          animation: `adBarGrow 0.6s ease ${i * 0.04}s both`,
                          cursor: "pointer", transition: "opacity 0.2s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                          onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                          onClick={() => navigate(`/zones/${z.id}`)}
                          title={z.name}
                        />
                      </div>
                    );
                  })}
                  {zones.length === 0 && Array(12).fill(null).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: "30%",
                      background: "#3a3939", borderRadius: "2px 2px 0 0",
                      animation: "adShimmer 1.4s ease infinite alternate" }} />
                  ))}
                </div>
                <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.3,
                  textAlign: "center", textTransform: "uppercase",
                  letterSpacing: "0.12em" }}>
                  Click any bar → Zone Details
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ OPERATIONS TAB ════════ */}
      {tab === 1 && (
        <div style={{ animation: "adFadeUp 0.35s ease both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Zone status grid */}
            <div style={{
              background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: 24,
            }}>
              <SectionTitle>Zone Status</SectionTitle>
              <div style={{ marginTop: 16, display: "flex",
                flexDirection: "column", gap: 8 }}>
                {zones.slice(0, 8).map((z, i) => {
                  const col = z.risk_level === "red" ? "#ff5451"
                    : z.risk_level === "orange" ? "#ffb95f"
                    : z.risk_level === "yellow" ? "#ffeb3b" : "#4edea3";
                  const score = Math.round((z.risk_score ?? 0) * 100);
                  return (
                    <div key={z.id ?? i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 12px", background: "#1c1b1b", borderRadius: 2,
                      borderLeft: `3px solid ${col}`,
                      animation: `adFadeUp 0.3s ease ${i * 0.04}s both`,
                      cursor: "pointer", transition: "background 0.2s",
                    }}
                      onClick={() => navigate(`/zones/${z.id}`)}
                      onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
                      onMouseLeave={e => e.currentTarget.style.background = "#1c1b1b"}
                    >
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1",
                          margin: "0 0 4px" }}>{z.name}</p>
                        <div style={{ height: 2, background: "#2a2a2a",
                          borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${score}%`,
                            background: col, animation: "adBarGrow 0.6s ease both" }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: col }}>
                        {score}%
                      </span>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: 14, color: "#e4beba", opacity: 0.3 }}>
                        chevron_right
                      </span>
                    </div>
                  );
                })}
                {zones.length === 0 && (
                  <p style={{ fontSize: 11, color: "#5b403e",
                    textAlign: "center", padding: "24px 0" }}>No zones found</p>
                )}
              </div>
            </div>

            {/* Active alerts */}
            <div style={{
              background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4, padding: 24,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 16 }}>
                <SectionTitle>Active Alerts</SectionTitle>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#ff5451",
                  background: "rgba(255,84,81,0.1)", padding: "3px 8px",
                  borderRadius: 2, animation: "adPulse 2s infinite" }}>
                  {activeAlerts} LIVE
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {alerts.filter(a => a.status === "active").slice(0, 6).map((a, i) => (
                  <div key={a.id ?? i} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    background: "#1c1b1b", borderRadius: 2, padding: "10px 12px",
                    borderLeft: "3px solid #ff5451",
                    animation: `adFadeUp 0.3s ease ${i * 0.05}s both`,
                    transition: "background 0.2s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
                    onMouseLeave={e => e.currentTarget.style.background = "#1c1b1b"}
                  >
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 18, color: "#ff5451", flexShrink: 0 }}>
                      warning
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1",
                        margin: "0 0 2px" }}>{a.zone_name}</p>
                      <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.5,
                        margin: 0 }}>{a.trigger_reason ?? "Alert triggered"}</p>
                    </div>
                    <span style={{ fontSize: 9, color: "#e4beba",
                      opacity: 0.4, flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
                  </div>
                ))}
                {alerts.filter(a => a.status === "active").length === 0 && (
                  <div style={{ textAlign: "center", padding: "28px 0" }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 36, color: "#3a3939", display: "block",
                        marginBottom: 8 }}>check_circle</span>
                    <p style={{ fontSize: 11, color: "#5b403e" }}>All clear</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════ LOGS TAB ════════ */}
      {tab === 2 && (
        <div style={{ animation: "adFadeUp 0.35s ease both" }}>
          <div style={{
            background: "rgba(42,42,42,0.6)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(91,64,62,0.15)", borderRadius: 4,
            overflow: "hidden",
          }}>
            <div style={{ padding: "18px 24px",
              borderBottom: "1px solid rgba(91,64,62,0.1)",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <SectionTitle>System Audit Log</SectionTitle>
              <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.4,
                fontFamily: "monospace" }}>
                {users.length} user entries
              </span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(28,27,27,0.5)",
                  borderBottom: "1px solid rgba(91,64,62,0.08)" }}>
                  {["User", "Role", "Email", "District", "Zone", "Joined"].map((h, j) => (
                    <th key={h} style={{
                      padding: "12px 20px", textAlign: "left",
                      fontSize: 9, fontWeight: 700, color: "#e4beba",
                      opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.12em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 20).map((u, i) => {
                  const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.field_worker;
                  return (
                    <tr key={u.id ?? i} style={{
                      borderBottom: "1px solid rgba(91,64,62,0.05)",
                      transition: "background 0.15s",
                      animation: `adFadeUp 0.3s ease ${i * 0.03}s both`,
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(42,42,42,0.4)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: "rgba(255,179,173,0.1)",
                            border: "1px solid rgba(255,179,173,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: 9, fontWeight: 800,
                              color: "#ffb3ad" }}>{initials(u.name)}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700,
                            color: "#e5e2e1" }}>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 20px" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color,
                          background: cfg.bg, borderRadius: 2, padding: "3px 8px",
                          textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: 10,
                        color: "#e4beba", opacity: 0.55,
                        fontFamily: "monospace" }}>{u.email}</td>
                      <td style={{ padding: "12px 20px", fontSize: 11,
                        color: "#e5e2e1" }}>{u.district ?? "—"}</td>
                      <td style={{ padding: "12px 20px", fontSize: 10,
                        color: "#e4beba", opacity: 0.5 }}>
                        {u.zone_assigned ? `…${u.zone_assigned.slice(-6)}` : "—"}
                      </td>
                      <td style={{ padding: "12px 20px", fontSize: 10,
                        color: "#e4beba", opacity: 0.4,
                        fontFamily: "monospace" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button onClick={openAdd} style={{
        position: "fixed", bottom: 32, right: 32,
        width: 52, height: 52, borderRadius: "50%", border: "none",
        background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
        boxShadow: "0 0 20px rgba(255,179,173,0.3)",
        cursor: "pointer", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        animation: "adFadeUp 0.5s ease 0.4s both",
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.1) rotate(90deg)";
          e.currentTarget.style.boxShadow = "0 0 32px rgba(255,84,81,0.5)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255,179,173,0.3)";
        }}
      >
        <span className="material-symbols-outlined"
          style={{ fontSize: 24, color: "#68000a",
            fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

      {/* ── Add / Edit Modal ── */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Add New User" : "Edit User"}
          onClose={() => setModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 14 }}>
            {[
              { key: "name",     label: "Full Name",   type: "text",     span: 2 },
              { key: "email",    label: "Email",        type: "email"              },
              { key: "password", label: modal === "add" ? "Password" : "New Password (optional)",
                type: "password" },
              { key: "district", label: "District",     type: "text"               },
              { key: "zone_assigned", label: "Zone ID", type: "text"               },
            ].map(({ key, label, type, span }) => (
              <div key={key} style={{ gridColumn: span === 2 ? "span 2" : undefined }}>
                <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.12em",
                  display: "block", marginBottom: 5 }}>{label}</label>
                <input type={type} value={form[key] ?? ""} placeholder={label}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: "100%", background: "#1c1b1b",
                    border: "1px solid rgba(91,64,62,0.25)", borderRadius: 2,
                    padding: "9px 12px", color: "#e5e2e1", fontSize: 12,
                    fontFamily: "Inter", outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.25)"}
                />
              </div>
            ))}
            {/* Role selector */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.12em",
                display: "block", marginBottom: 5 }}>Role</label>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(ROLE_CFG).map(([rk, rv]) => (
                  <button key={rk} onClick={() => setForm(f => ({ ...f, role: rk }))} style={{
                    flex: 1, padding: "8px 6px", borderRadius: 2,
                    border: `1px solid ${form.role === rk ? rv.color + "55" : "rgba(91,64,62,0.2)"}`,
                    background: form.role === rk ? rv.bg : "transparent",
                    color: form.role === rk ? rv.color : "#e4beba",
                    fontSize: 9, fontWeight: 800, fontFamily: "Inter",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>{rv.label}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex",
            justifyContent: "flex-end", gap: 10 }}>
            <AdBtn label="Cancel" onClick={() => setModal(null)} />
            <AdBtn primary label={saving ? "Saving…" : modal === "add" ? "Create User" : "Save Changes"}
              onClick={submitUser} disabled={saving} />
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {modal === "delete" && (
        <Modal title="Delete User" onClose={() => setModal(null)} danger>
          <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "rgba(255,84,81,0.1)",
              border: "2px solid rgba(255,84,81,0.2)",
              display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 16px",
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 28, color: "#ff5451" }}>person_remove</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#e5e2e1",
              margin: "0 0 6px" }}>Delete {editing?.name}?</p>
            <p style={{ fontSize: 11, color: "#e4beba", opacity: 0.55 }}>
              This action cannot be undone.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            <AdBtn label="Cancel" onClick={() => setModal(null)} />
            <AdBtn danger label={deleting ? "Deleting…" : "Delete User"}
              onClick={deleteUser} disabled={deleting} />
          </div>
        </Modal>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity={snackbar?.type || "success"}
          variant="filled"
          onClose={() => setSnackbar(null)}
        >
          {snackbar?.message || "Done"}
        </Alert>
      </Snackbar>

      <style>{CSS}</style>
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────
function UserRow({ user: u, idx, menuUser, setMenuUser, menuRef, onEdit, onDelete }) {
  const cfg = ROLE_CFG[u.role] ?? ROLE_CFG.field_worker;
  const isOnline = u.last_login &&
    (Date.now() - new Date(u.last_login)) < 3600000;

  return (
    <tr style={{
      borderBottom: "1px solid rgba(91,64,62,0.05)",
      transition: "background 0.15s",
      animation: `adFadeUp 0.3s ease ${idx * 0.04}s both`,
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(42,42,42,0.4)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Name + email */}
      <td style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(255,179,173,0.1)",
            border: `1px solid ${isOnline ? "rgba(78,222,163,0.3)" : "rgba(255,179,173,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#ffb3ad" }}>
              {initials(u.name)}
            </span>
            {isOnline && (
              <span style={{
                position: "absolute", bottom: -1, right: -1,
                width: 8, height: 8, borderRadius: "50%",
                background: "#4edea3", border: "1.5px solid #131313",
                animation: "adPulse 2s infinite",
              }} />
            )}
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#e5e2e1",
              margin: "0 0 2px" }}>{u.name}</p>
            <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.45,
              fontFamily: "monospace", margin: 0 }}>{u.email}</p>
          </div>
        </div>
      </td>
      {/* District */}
      <td style={{ padding: "14px 18px", fontSize: 11,
        color: "#e5e2e1" }}>{u.district ?? "—"}</td>
      {/* Role */}
      <td style={{ padding: "14px 18px" }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color: cfg.color, background: cfg.bg,
          borderRadius: 2, padding: "3px 8px", textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>{cfg.label}</span>
      </td>
      {/* Last active */}
      <td style={{ padding: "14px 18px", fontSize: 10,
        color: isOnline ? "#4edea3" : "#e4beba",
        fontFamily: "monospace",
        opacity: isOnline ? 1 : 0.5,
        fontWeight: isOnline ? 700 : 400,
      }}>
        {isOnline ? "Online Now" : timeAgo(u.last_login)}
      </td>
      {/* Menu */}
      <td style={{ padding: "14px 18px", textAlign: "right",
        position: "relative" }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 18, color: "#e4beba", opacity: 0.5,
          cursor: "pointer", transition: "opacity 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
          onClick={e => {
            e.stopPropagation();
            setMenuUser(menuUser === u.id ? null : u.id);
          }}
        >more_vert</span>

        {menuUser === u.id && (
          <div ref={menuRef} style={{
            position: "absolute", right: 16, top: "100%", zIndex: 100,
            background: "#2a2a2a", border: "1px solid rgba(91,64,62,0.2)",
            borderRadius: 4, overflow: "hidden", minWidth: 140,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            animation: "adMenuIn 0.18s ease both",
          }}>
            {[
              { icon: "edit", label: "Edit User",   onClick: onEdit,   color: "#e5e2e1" },
              { icon: "person_remove", label: "Delete User", onClick: onDelete, color: "#ff5451" },
            ].map(({ icon, label, onClick: oc, color }) => (
              <button key={label} onClick={e => { e.stopPropagation(); oc(); }} style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "10px 14px", background: "none",
                border: "none", cursor: "pointer", fontFamily: "Inter",
                fontSize: 11, fontWeight: 600, color,
                transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span className="material-symbols-outlined"
                  style={{ fontSize: 16, color }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Modal Shell ───────────────────────────────────────────────
function Modal({ title, children, onClose, danger }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "adModalBg 0.2s ease both",
    }}
      onClick={onClose}
    >
      <div style={{
        background: "#201f1f", borderRadius: 4, padding: 28,
        border: `1px solid ${danger ? "rgba(255,84,81,0.2)" : "rgba(91,64,62,0.2)"}`,
        width: "100%", maxWidth: 520,
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        animation: "adModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 20,
          borderBottom: "1px solid rgba(91,64,62,0.12)", paddingBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e5e2e1", margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#e4beba", opacity: 0.5, padding: 4,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <h2 style={{
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 13, fontWeight: 700, color: "#e5e2e1", margin: 0,
    }}>
      <span style={{ width: 3, height: 14, background: "#ffb3ad",
        borderRadius: 2, display: "inline-block" }} />
      {children}
    </h2>
  );
}

function AdBtn({ label, onClick, primary, danger, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "9px 20px", borderRadius: 2, border: "none",
        cursor: disabled ? "wait" : "pointer", fontFamily: "Inter",
        fontSize: 9, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: "0.12em", transition: "all 0.2s",
        opacity: disabled ? 0.6 : 1,
        background: danger
          ? hov ? "#ff5451" : "rgba(255,84,81,0.15)"
          : primary
            ? hov ? "rgba(255,84,81,0.9)"
                  : "linear-gradient(135deg,#ffb3ad,#ff5451)"
            : hov ? "#3a3939" : "#2a2a2a",
        color: danger ? (hov ? "#fff" : "#ff5451")
          : primary ? "#68000a" : "#e4beba",
        boxShadow: primary && !disabled ? "0 4px 16px rgba(255,84,81,0.25)" : "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
      }}>{label}</button>
  );
}


const CSS = `
  @keyframes adFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes adSlideDown { from{opacity:0;transform:translateY(-8px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes adShimmer   { from{opacity:0.2} to{opacity:0.55} }
  @keyframes adBarGrow   { from{width:0%;height:0%} to{} }
  @keyframes adPulse     { 0%,100%{opacity:1;box-shadow:0 0 8px currentColor} 50%{opacity:0.4;box-shadow:none} }
  @keyframes adBarBounce { from{transform:scaleY(0.6)} to{transform:scaleY(1)} }
  @keyframes adSyncBar   { from{width:0%} to{} }
  @keyframes adMenuIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes adModalBg   { from{opacity:0} to{opacity:1} }
  @keyframes adModalIn   { from{opacity:0;transform:scale(0.93) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 100px #1c1b1b inset !important;
    -webkit-text-fill-color: #e5e2e1 !important;
  }
  ::-webkit-scrollbar { width: 3px }
  ::-webkit-scrollbar-track { background:#0e0e0e }
  ::-webkit-scrollbar-thumb { background:#3a3939; border-radius:4px }
`;
