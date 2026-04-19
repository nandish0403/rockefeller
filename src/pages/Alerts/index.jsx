import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAlerts,
  acknowledgeAlert,
  resolveAlert,
} from "../../api/alerts";
import { sendEmergencyBroadcast } from "../../api/emergency";
import { MapContainer, TileLayer, useMap } from "react-leaflet";


// ── Risk config ────────────────────────────────────────────────
const RISK = {
  red:    { label: "Critical",  color: "#ff5451", bg: "rgba(255,84,81,0.08)",  border: "#ff5451" },
  orange: { label: "Elevated",  color: "#ffb95f", bg: "rgba(255,185,95,0.08)", border: "#ffb95f" },
  yellow: { label: "Warning",   color: "#ffeb3b", bg: "rgba(255,235,59,0.08)", border: "#ffeb3b" },
  green:  { label: "Normal",    color: "#4edea3", bg: "rgba(78,222,163,0.08)", border: "#4edea3" },
  emergency: { label: "Emergency", color: "#ff2f2f", bg: "rgba(255,47,47,0.16)", border: "#ff2f2f" },
};

// ── Source → icon mapping ──────────────────────────────────────
const SOURCE_ICON = {
  ml_model:           "psychology",
  crack_confirmed:    "running_with_errors",
  rainfall_threshold: "water_drop",
  blast_threshold:    "explosion",
  manual:             "person",
  rule_engine:        "sensors",
};

// ── Time-ago helper ───────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Status tabs ────────────────────────────────────────────────
const TABS = ["active", "acknowledged", "resolved"];

export default function AlertsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canManage = ["admin", "safety_officer"].includes(currentUser?.role);
  const isFieldWorker = currentUser?.role === "field_worker";
  const canAcknowledge = ["admin", "safety_officer"].includes(currentUser?.role);
  const canBroadcast = ["admin", "safety_officer"].includes(currentUser?.role);
  const canResolve = currentUser?.role === "admin";

  const [alerts,      setAlerts]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState("active");
  const [search,      setSearch]      = useState("");
  const [distFilter,  setDistFilter]  = useState("All");
  const [riskFilter,  setRiskFilter]  = useState("All");
  const [expanded,    setExpanded]    = useState(null);  // alert id
  const [selected,    setSelected]    = useState(new Set());
  const [bulkMode,    setBulkMode]    = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [mounted,     setMounted]     = useState(false);

  // Load alerts
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts({ status: tab });
      setAlerts(data ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 60);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Actions ────────────────────────────────────────────────
  const doAcknowledge = async (id, e) => {
    e?.stopPropagation();
    setActionLoading(id + "_ack");
    try {
      await acknowledgeAlert(id);
      await load();
    } finally { setActionLoading(null); }
  };

  const doResolve = async (id, e) => {
    e?.stopPropagation();
    setActionLoading(id + "_res");
    try {
      await resolveAlert(id);
      await load();
    } finally { setActionLoading(null); }
  };

  const doBatchAcknowledge = async () => {
    if (!canManage) return;
    for (const id of selected) await acknowledgeAlert(id).catch(() => {});
    setSelected(new Set());
    setBulkMode(false);
    await load();
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const doEmergencyBroadcast = async (alert, e) => {
    e?.stopPropagation();
    if (!canBroadcast) return;

    setActionLoading(alert.id + "_emg");
    try {
      await sendEmergencyBroadcast({
        zone_id: alert.zone_id,
        message: `Emergency declared for ${alert.zone_name}. Evacuate immediately and follow muster protocol.`,
      });
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────────
  const districts = ["All", ...new Set(alerts.map(a => a.district).filter(Boolean))];

  const visible = alerts
    .filter(a => {
      const q = search.toLowerCase();
      const matchSearch = !search
        || a.zone_name?.toLowerCase().includes(q)
        || a.trigger_reason?.toLowerCase().includes(q)
        || a.district?.toLowerCase().includes(q);
      const matchDist = distFilter === "All" || a.district === distFilter;
      const matchRisk = riskFilter === "All" || a.risk_level === riskFilter.toLowerCase();
      return matchSearch && matchDist && matchRisk;
    })
    .sort((a, b) => {
      const at = new Date(a?.created_at || 0).getTime();
      const bt = new Date(b?.created_at || 0).getTime();
      return bt - at;
    });

  const counts = TABS.reduce((acc, t) => {
    acc[t] = alerts.filter(a => a.status === t).length;
    return acc;
  }, {});
  counts.active = tab === "active" ? visible.length : counts.active;

  // ── Render ─────────────────────────────────────────────────
  const safeBulkMode = canManage ? bulkMode : false;

  return (
  <div
    style={{
      // let your existing shell (sidebar + topbar) control positioning
      minHeight: "100vh",
      background: "#0e0e0e",
      fontFamily: "Inter, sans-serif",
      paddingBottom: 120,
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.4s ease",
    }}
  >
    <div style={{ padding: "32px 32px 0",}}>
      {/* rest of the content stays the same */}


        {/* ── Search + Filters ── */}
        <section style={{
          display: "flex", flexDirection: "column", gap: 16,
          marginBottom: 28,
          animation: "slideDown 0.4s ease both",
        }}>
          <div style={{
            display: "flex", flexWrap: "wrap",
            alignItems: "center", gap: 12,
          }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: 280, position: "relative" }}>
              <span className="material-symbols-outlined" style={{
                position: "absolute", left: 14, top: "50%",
                transform: "translateY(-50%)",
                fontSize: 18, color: "rgba(228,190,186,0.4)",
                pointerEvents: "none",
              }}>search</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search alerts by zone or trigger..."
                style={{
                  width: "100%", background: "#201f1f",
                  border: "1px solid rgba(91,64,62,0.15)",
                  borderRadius: 4, padding: "11px 14px 11px 44px",
                  color: "#e5e2e1", fontSize: 13,
                  fontFamily: "Inter", outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                onBlur={e  => e.target.style.borderColor = "rgba(91,64,62,0.15)"}
              />
            </div>

            {/* Dropdowns */}
            {[
              { val: distFilter, set: setDistFilter,
                opts: districts.map(d => ({ v: d, l: d })), placeholder: "All Districts" },
              { val: riskFilter, set: setRiskFilter,
                opts: [
                  { v: "All", l: "Risk Level" },
                  { v: "red",    l: "Critical" },
                  { v: "orange", l: "Elevated" },
                  { v: "yellow", l: "Warning"  },
                  { v: "green",  l: "Normal"   },
                ], placeholder: "Risk Level" },
            ].map(({ val, set, opts }, i) => (
              <div key={i} style={{ position: "relative" }}>
                <select value={val} onChange={e => set(e.target.value)} style={{
                  background: "#201f1f",
                  border: "1px solid rgba(91,64,62,0.15)",
                  borderRadius: 4, padding: "11px 32px 11px 14px",
                  color: "#e4beba", fontSize: 12,
                  fontFamily: "Inter", outline: "none",
                  appearance: "none", cursor: "pointer",
                  minWidth: 140,
                }}>
                  {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", right: 8, top: "50%",
                  transform: "translateY(-50%)", fontSize: 14,
                  color: "#e4beba", pointerEvents: "none",
                }}>expand_more</span>
              </div>
            ))}

            {/* Reload */}
            <button onClick={load} style={{
              background: "#2a2a2a",
              border: "1px solid rgba(91,64,62,0.15)",
              borderRadius: 4, padding: "11px 12px",
              color: "#e4beba", cursor: "pointer",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffb3ad"}
              onMouseLeave={e => e.currentTarget.style.color = "#e4beba"}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>tune</span>
            </button>
          </div>

          {/* ── Tabs + Bulk actions ── */}
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(91,64,62,0.12)",
          }}>
            <div style={{ display: "flex", gap: 4 }}>
              {TABS.map(t => (
                <button key={t} onClick={() => { setTab(t); setSelected(new Set()); }}
                  style={{
                    padding: "14px 20px", background: "transparent",
                    border: "none", cursor: "pointer",
                    fontFamily: "Inter", fontSize: 13,
                    fontWeight: tab === t ? 700 : 500,
                    color: tab === t ? "#ffb3ad" : "#e4beba",
                    opacity: tab === t ? 1 : 0.6,
                    position: "relative",
                    transition: "all 0.2s",
                    textTransform: "capitalize",
                  }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
                  <span style={{ opacity: 0.6 }}>
                    ({tab === t ? visible.length : (counts[t] ?? 0)})
                  </span>
                  {tab === t && (
                    <div style={{
                      position: "absolute", bottom: 0, left: 0,
                      width: "100%", height: 2,
                      background: "#ffb3ad",
                      borderRadius: "2px 2px 0 0",
                      animation: "expandWidth 0.25s ease both",
                    }} />
                  )}
                </button>
              ))}
            </div>

            {/* Bulk actions */}
            {canManage && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 4 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer", fontSize: 11, color: "#e4beba",
                fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                <input type="checkbox" checked={bulkMode}
                  onChange={e => { setBulkMode(e.target.checked); setSelected(new Set()); }}
                  style={{ accentColor: "#ffb3ad", width: 14, height: 14 }} />
                Bulk Select
              </label>

              <div style={{ width: 1, height: 16, background: "rgba(91,64,62,0.3)" }} />

              <button
                onClick={doBatchAcknowledge}
                disabled={selected.size === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 2,
                  background: selected.size > 0 ? "#2a2a2a" : "transparent",
                  border: "1px solid rgba(91,64,62,0.2)",
                  color: selected.size > 0 ? "#e5e2e1" : "#e4beba",
                  opacity: selected.size > 0 ? 1 : 0.4,
                  cursor: selected.size > 0 ? "pointer" : "not-allowed",
                  fontSize: 11, fontWeight: 700, fontFamily: "Inter",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  transition: "all 0.2s",
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done_all</span>
                Batch Acknowledge {selected.size > 0 ? `(${selected.size})` : ""}
              </button>
            </div>
            )}
          </div>
        </section>

        {isFieldWorker && (
          <div style={{
            marginBottom: 14,
            background: "rgba(78,222,163,0.08)",
            border: "1px solid rgba(78,222,163,0.2)",
            borderRadius: 2,
            padding: "10px 14px",
            color: "#4edea3",
            fontSize: 11,
            letterSpacing: "0.04em",
          }}>
            Read-only alerts view. Acknowledge, resolve, and emergency actions are restricted to officers/admin.
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: 120, background: "#201f1f",
                borderRadius: 4, borderLeft: "4px solid #3a3939",
                animation: `shimmer 1.5s ease ${i * 0.1}s infinite alternate`,
              }} />
            ))}
          </div>
        )}

        {/* ── Alert cards ── */}
        {!loading && visible.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 0",
            animation: "fadeUp 0.4s ease both",
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 56, color: "#3a3939", display: "block", marginBottom: 16 }}>
              notifications_off
            </span>
            <p style={{ fontSize: 13, color: "#5b403e", textTransform: "uppercase",
              letterSpacing: "0.12em" }}>
              No {tab} alerts found
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!loading && visible.map((alert, idx) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              idx={idx}
              expanded={expanded === alert.id}
              onToggleExpand={() => setExpanded(p => p === alert.id ? null : alert.id)}
              bulkMode={safeBulkMode}
              selected={selected.has(alert.id)}
              onSelect={() => toggleSelect(alert.id)}
              onAcknowledge={(e) => doAcknowledge(alert.id, e)}
              onResolve={(e)     => doResolve(alert.id, e)}
              onEmergency={(e)   => doEmergencyBroadcast(alert, e)}
              canAcknowledge={canAcknowledge}
              canBroadcast={canBroadcast}
              canResolve={canResolve}
              canManage={canManage}
              ackLoading={actionLoading === alert.id + "_ack"}
              resLoading={actionLoading === alert.id + "_res"}
              emgLoading={actionLoading === alert.id + "_emg"}
            />
          ))}
        </div>

        {/* ── Load more ── */}
        {!loading && visible.length > 0 && (
          <div style={{
            display: "flex", justifyContent: "center",
            marginTop: 40,
            animation: "fadeUp 0.4s ease 0.3s both",
          }}>
            <button onClick={load} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 32px", background: "#2a2a2a",
              border: "1px solid rgba(91,64,62,0.15)",
              borderRadius: 2, color: "#e5e2e1",
              fontSize: 12, fontWeight: 700, fontFamily: "Inter",
              textTransform: "uppercase", letterSpacing: "0.12em",
              cursor: "pointer", transition: "all 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
              onMouseLeave={e => e.currentTarget.style.background = "#2a2a2a"}>
              Refresh Alerts
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Floating map preview ── */}
      <FloatingMapPreview />

      <style>{`
        @keyframes slideDown  { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(10px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes expandWidth{ from { width:0; } to { width:100%; } }
        @keyframes shimmer    { from { opacity:0.4; } to { opacity:0.8; } }
        @keyframes critPulse  { 0%,100% { box-shadow:0 0 0 0 rgba(255,84,81,0.4); } 70% { box-shadow:0 0 0 8px rgba(255,84,81,0); } }
        @keyframes fadeIn     { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        select option { background:#1c1b1b; color:#e5e2e1; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-track { background:#0e0e0e; }
        ::-webkit-scrollbar-thumb { background:#3a3939; border-radius:4px; }
      `}</style>
    </div>
  );
}

// ── Alert card ─────────────────────────────────────────────────
function AlertCard({
  alert, idx, expanded, onToggleExpand,
  bulkMode, selected, onSelect,
  onAcknowledge, onResolve, onEmergency, canAcknowledge, canBroadcast, canResolve, canManage, ackLoading, resLoading, emgLoading,
}) {
  const risk    = RISK[alert.risk_level] ?? RISK.green;
  const isCrit  = alert.risk_level === "red";
  const srcIcon = SOURCE_ICON[alert.trigger_source] ?? "sensors";

  return (
    <article
      onClick={() => bulkMode ? onSelect() : onToggleExpand()}
      style={{
        background: "#201f1f",
        borderLeft: `4px solid ${risk.border}`,
        borderRadius: "0 4px 4px 0",
        overflow: "hidden",
        cursor: "pointer",
        transition: "background 0.2s, transform 0.15s",
        position: "relative",
        animation: `fadeUp 0.35s ease ${idx * 0.05}s both`,
        boxShadow: isCrit
          ? `inset 0 0 20px rgba(255,84,81,0.04)`
          : "none",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "#2a2a2a";
        e.currentTarget.style.transform = "translateX(2px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "#201f1f";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      {/* Critical pulse strip */}
      {isCrit && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, #ff5451, transparent)",
          animation: "shimmer 2s ease infinite",
        }} />
      )}

      <div style={{ padding: "20px 24px" }}>
        <div style={{
          display: "flex", gap: 24,
          flexWrap: "wrap",
        }}>

          {/* ── LEFT: Main info ── */}
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* Meta row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              marginBottom: 10,
            }}>
              {bulkMode && (
                <input type="checkbox" checked={selected}
                  onChange={e => { e.stopPropagation(); onSelect(); }}
                  style={{ accentColor: "#ffb3ad", width: 14, height: 14, flexShrink: 0 }}
                  onClick={e => e.stopPropagation()}
                />
              )}
              <span style={{ fontSize: 9, fontWeight: 700,
                color: "#e4beba", opacity: 0.6,
                textTransform: "uppercase", letterSpacing: "0.15em" }}>
                District: {alert.district || "—"}
              </span>
              <div style={{ width: 3, height: 3, borderRadius: "50%",
                background: "#5b403e" }} />
              <span style={{ fontSize: 9, fontWeight: 700,
                color: "#e4beba", opacity: 0.6,
                textTransform: "uppercase", letterSpacing: "0.15em" }}>
                {timeAgo(alert.created_at)}
              </span>
              {isCrit && (
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#ff5451",
                  animation: "critPulse 1.5s infinite",
                  marginLeft: 4,
                }} />
              )}
            </div>

            {/* Zone name + badge */}
            <h3 style={{
              fontSize: 20, fontWeight: 700, color: "#e5e2e1",
              margin: "0 0 16px",
              display: "flex", alignItems: "center",
              gap: 12, flexWrap: "wrap",
            }}>
              {alert.zone_name || "Unknown Zone"}
              <span style={{
                fontSize: 9, fontWeight: 800, padding: "3px 10px",
                borderRadius: 2,
                border: `1px solid ${risk.color}33`,
                background: risk.bg,
                color: risk.color,
                textTransform: "uppercase", letterSpacing: "0.12em",
                animation: isCrit ? "critPulse 1.5s infinite" : "none",
              }}>
                {risk.label}
              </span>
            </h3>

            {/* Stat chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <StatChip label="Trigger Reason"
                value={alert.trigger_reason || "—"} />
              <StatChip label="Source Sensor"
                icon={srcIcon} iconColor="#4edea3"
                value={
                  alert.trigger_source
                    ?.replace(/_/g, " ")
                    .replace(/\b\w/g, l => l.toUpperCase())
                  || "—"
                }
              />
              <StatChip label="Risk Probability"
                value={alert.risk_probability
                  ? `${(alert.risk_probability * 100).toFixed(1)}%`
                  : "—"}
                valueColor={risk.color}
              />
            </div>
          </div>

          {/* ── RIGHT: Actions ── */}
          <div style={{
            width: 240, flexShrink: 0,
            borderLeft: "1px solid rgba(91,64,62,0.12)",
            paddingLeft: 20,
            display: "flex", flexDirection: "column",
            justifyContent: "space-between",
          }}>
            {/* Assigned */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6,
                marginBottom: 12 }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: 16,
                  color: alert.acknowledged_by ? "#ffb3ad" : "#e4beba",
                  opacity: alert.acknowledged_by ? 1 : 0.3,
                }}>account_circle</span>
                <span style={{ fontSize: 11, color: "#e4beba" }}>
                  {alert.acknowledged_by
                    ? <>Ack by: <strong style={{ color: "#e5e2e1" }}>{alert.acknowledged_by}</strong></>
                    : alert.status === "resolved"
                      ? <>Resolved by: <strong style={{ color: "#e5e2e1" }}>{alert.resolved_by || "—"}</strong></>
                      : <em style={{ color: "#e5e2e1" }}>Unassigned</em>
                  }
                </span>
              </div>

              {canManage ? (
              <div style={{ display: "flex", gap: 8 }}>
                {/* Acknowledge */}
                {canAcknowledge && alert.status === "active" && (
                  <ActionBtn
                    onClick={onAcknowledge}
                    loading={ackLoading}
                    label="Acknowledge"
                    variant="ghost"
                  />
                )}
                {/* Resolve */}
                {canResolve && (alert.status === "active" || alert.status === "acknowledged") && (
                  <ActionBtn
                    onClick={onResolve}
                    loading={resLoading}
                    label="Resolve"
                    variant={isCrit ? "primary" : "secondary"}
                  />
                )}
                {canBroadcast && (
                  <ActionBtn
                    onClick={onEmergency}
                    loading={emgLoading}
                    label="Emergency"
                    variant="primary"
                  />
                )}
                {alert.status === "resolved" && (
                  <span style={{ fontSize: 10, color: "#4edea3",
                    fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.1em", display: "flex",
                    alignItems: "center", gap: 4 }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    Resolved
                  </span>
                )}
              </div>
              ) : (
              <div style={{
                fontSize: 10,
                color: "#e4beba",
                opacity: 0.75,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                Read-only
              </div>
              )}
            </div>

            {/* Expand toggle */}
            <button
              onClick={e => { e.stopPropagation(); onToggleExpand(); }}
              style={{
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 4,
                background: "transparent", border: "none",
                color: "#e4beba", cursor: "pointer",
                fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.1em",
                fontFamily: "Inter", padding: "8px 0",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#ffb3ad"}
              onMouseLeave={e => e.currentTarget.style.color = "#e4beba"}>
              {expanded ? "Hide" : "Recommended Action"}
              <span className="material-symbols-outlined" style={{
                fontSize: 16,
                transform: expanded ? "rotate(180deg)" : "none",
                transition: "transform 0.25s ease",
              }}>expand_more</span>
            </button>
          </div>
        </div>

        {/* ── Expandable SOP section ── */}
        <div style={{
          overflow: "hidden",
          maxHeight: expanded ? 200 : 0,
          opacity: expanded ? 1 : 0,
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}>
          <div style={{
            marginTop: 20, paddingTop: 20,
            borderTop: "1px solid rgba(91,64,62,0.12)",
          }}>
            <div style={{
              background: `${risk.bg}`,
              border: `1px solid ${risk.color}22`,
              borderRadius: 2, padding: "14px 16px",
              display: "flex", alignItems: "flex-start", gap: 12,
              animation: "fadeIn 0.3s ease both",
            }}>
              <span className="material-symbols-outlined" style={{
                color: risk.color, fontSize: 18, flexShrink: 0, marginTop: 1,
                fontVariationSettings: "'FILL' 1",
              }}>emergency</span>
              <div>
                <p style={{ fontSize: 9, fontWeight: 800, color: risk.color,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                  margin: "0 0 6px" }}>
                  SOP ACTION REQUIRED
                </p>
                <p style={{ fontSize: 13, color: "#e5e2e1",
                  lineHeight: 1.65, margin: 0 }}>
                  {alert.recommended_action || "No specific action protocol defined. Monitor telemetry feeds and escalate if risk exceeds threshold."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Stat chip ──────────────────────────────────────────────────
function StatChip({ label, value, icon, iconColor, valueColor }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 9, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#e4beba",
        opacity: 0.5, fontWeight: 500, marginBottom: 4 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon && (
          <span className="material-symbols-outlined"
            style={{ fontSize: 14, color: iconColor || "#e4beba" }}>
            {icon}
          </span>
        )}
        <span style={{ fontSize: 13, fontWeight: 600,
          color: valueColor || "#e5e2e1" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Action button ──────────────────────────────────────────────
function ActionBtn({ onClick, loading, label, variant }) {
  const styles = {
    primary:   { bg: "linear-gradient(135deg,#ffb3ad,#ff5451)", color: "#68000a", border: "none" },
    secondary: { bg: "#2a2a2a", color: "#e5e2e1", border: "1px solid rgba(91,64,62,0.2)" },
    ghost:     { bg: "rgba(58,57,57,0.5)", color: "#e5e2e1", border: "1px solid rgba(91,64,62,0.2)" },
  }[variant] || {};

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(e); }}
      disabled={loading}
      style={{
        flex: 1, padding: "8px 10px",
        background: styles.bg, color: styles.color,
        border: styles.border, borderRadius: 2,
        fontSize: 10, fontWeight: 700, fontFamily: "Inter",
        textTransform: "uppercase", letterSpacing: "0.08em",
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.2s", opacity: loading ? 0.6 : 1,
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 4,
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
    >
      {loading
        ? <span style={{
            width: 10, height: 10,
            border: "2px solid rgba(228,190,186,0.3)",
            borderTopColor: "#e4beba", borderRadius: "50%",
            display: "inline-block",
            animation: "spin 0.7s linear infinite",
          }} />
        : label
      }
    </button>
  );
}

// ── Floating map preview ───────────────────────────────────────
function FloatingMapPreview() {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => navigate("/map")}
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        width: hov ? 210 : 180,
        height: hov ? 210 : 180,
        zIndex: 30,
        borderRadius: 4,
        overflow: "hidden",
        border: `1px solid ${hov ? "rgba(255,179,173,0.35)" : "rgba(91,64,62,0.25)"}`,
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
        animation: "fadeUp 0.5s ease 0.4s both",
      }}
    >
      {/* ── Actual dark Leaflet map ── */}
      <MapContainer
        center={[19.7515, 75.7139]}
        zoom={6}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          filter: hov ? "none" : "grayscale(0.4) brightness(0.75)",
          transition: "filter 0.4s ease",
        }}
      >
        <MiniMapSizer sizeKey={hov ? "expanded" : "compact"} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      </MapContainer>

      {/* ── Gradient overlay so text is readable ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1,
        background: "linear-gradient(to top, rgba(14,14,14,0.85) 0%, rgba(14,14,14,0.1) 55%, transparent 100%)",
        pointerEvents: "none",
      }} />

      {/* ── UI Layer ── */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 2,
        padding: 10,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        pointerEvents: "none",
      }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{
            fontSize: 8, fontWeight: 700, color: "#ffb3ad",
            background: "rgba(14,14,14,0.7)",
            padding: "3px 7px", borderRadius: 2,
            border: "1px solid rgba(255,179,173,0.2)",
            textTransform: "uppercase", letterSpacing: "0.1em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#4edea3",
              animation: "critPulse 2s infinite",
            }} />
            LIVE FEED
          </span>
          <span className="material-symbols-outlined" style={{
            fontSize: 14, color: hov ? "#ffb3ad" : "rgba(228,190,186,0.6)",
            transition: "color 0.2s",
            background: "rgba(14,14,14,0.6)",
            borderRadius: 2, padding: 3,
          }}>open_in_full</span>
        </div>

        {/* Bottom row */}
        <div>
          <p style={{
            fontSize: 8, color: "#e4beba", opacity: 0.6,
            textTransform: "uppercase", letterSpacing: "0.1em",
            margin: "0 0 2px", fontWeight: 700,
          }}>Geospatial Overlay</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1", margin: 0 }}>
            Maharashtra — Live
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniMapSizer({ sizeKey }) {
  const map = useMap();

  useEffect(() => {
    const handle = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(handle);
  }, [map, sizeKey]);

  return null;
}
