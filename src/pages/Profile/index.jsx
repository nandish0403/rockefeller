import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

// ── helpers ────────────────────────────────────────────────────
function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function initials(name = "") {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";
}

// Animated counter hook
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target, duration]);
  return val;
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE — routes to Admin or FieldWorker view
// ══════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [editForm, setEditForm] = useState({});

  // Data specific to roles
  const [zones,       setZones]      = useState([]);
  const [users,       setUsers]      = useState([]);
  const [reports,     setReports]    = useState([]);
  const [cracks,      setCracks]     = useState([]);
  const [auditLog,    setAuditLog]   = useState([]);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "safety_officer";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: me } = await api.get("/api/auth/me");
      setProfile(me);
      setEditForm({ name: me.name, email: me.email,
        district: me.district ?? "", zone_assigned: me.zone_assigned ?? "" });

      if (isAdmin) {
        const [{ data: zoneData }, { data: userData },
               { data: reportData }, { data: crackData }] = await Promise.all([
          api.get("/api/zones").catch(() => ({ data: [] })),
          api.get("/api/users").catch(() => ({ data: [] })),
          api.get("/api/reports?limit=5").catch(() => ({ data: [] })),
          api.get("/api/crack-reports?limit=5").catch(() => ({ data: [] })),
        ]);
        setZones(zoneData ?? []);
        setUsers(userData ?? []);
        // Build synthetic audit log from reports + cracks
        const combined = [
          ...(reportData ?? []).map(r => ({
            type: "report", id: r.id,
            label: `Field Report: ${r.zone_name ?? "Unknown zone"}`,
            status: r.review_status ?? "pending",
            ts: r.created_at,
            icon: "description",
            color: r.severity === "critical" ? "#ff5451"
              : r.severity === "high" ? "#ffb3ad"
              : r.severity === "medium" ? "#ffb95f" : "#4edea3",
          })),
          ...(crackData ?? []).map(c => ({
            type: "crack", id: c.id,
            label: `Crack Detected: ${c.zone_name ?? "Zone"}`,
            status: c.review_status ?? "pending",
            ts: c.created_at,
            icon: "running_with_errors",
            color: c.ai_risk_score >= 0.8 ? "#ff5451"
              : c.ai_risk_score >= 0.5 ? "#ffb95f" : "#4edea3",
          })),
        ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);
        setAuditLog(combined);
      } else {
        const [{ data: rep }, { data: cr }] = await Promise.all([
          api.get("/api/reports").catch(() => ({ data: [] })),
          api.get("/api/crack-reports").catch(() => ({ data: [] })),
        ]);
        setReports(rep ?? []);
        setCracks(cr ?? []);
        const combined = [
          ...(rep ?? []).map(r => ({
            type: "report", id: r.id,
            label: `Field Report: ${r.zone_name ?? "Zone"}`,
            status: r.severity,
            ref: `#RPT-${r.id?.slice(-4).toUpperCase() ?? "0000"}`,
            ts: r.created_at,
            icon: "description",
          })),
          ...(cr ?? []).map(c => ({
            type: "crack", id: c.id,
            label: `Crack Report: ${c.zone_name ?? "Zone"}`,
            status: c.ai_severity_class ?? c.review_status,
            ref: `#CR-${c.id?.slice(-4).toUpperCase() ?? "0000"}`,
            ts: c.created_at,
            icon: "running_with_errors",
          })),
        ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 6);
        setAuditLog(combined);
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch("/api/auth/me", editForm);
      await load();
      setEditing(false);
    } catch { /* show toast via your toast lib */ }
    finally { setSaving(false); }
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) return (
    <div style={{ padding: 48, textAlign: "center", fontFamily: "Inter" }}>
      <p style={{ color: "#5b403e", fontSize: 11,
        textTransform: "uppercase", letterSpacing: "0.12em" }}>
        Unable to load profile
      </p>
    </div>
  );

  return (
    <div style={{
      padding: "32px 32px 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}>
      {isAdmin
        ? <AdminProfile
            profile={profile} zones={zones} users={users}
            auditLog={auditLog} editing={editing} editForm={editForm}
            setEditForm={setEditForm} setEditing={setEditing}
            onSave={saveProfile} saving={saving} navigate={navigate}
          />
        : <FieldWorkerProfile
            profile={profile} reports={reports} cracks={cracks}
            auditLog={auditLog} editing={editing} editForm={editForm}
            setEditForm={setEditForm} setEditing={setEditing}
            onSave={saveProfile} saving={saving}
          />
      }
      <style>{CSS}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN PROFILE VIEW
// ══════════════════════════════════════════════════════════════
function AdminProfile({ profile, zones, users, auditLog,
  editing, editForm, setEditForm, setEditing, onSave, saving, navigate }) {

  const zoneCount = useCountUp(zones.length);
  const userCount = useCountUp(users.length);
  const critZones = zones.filter(z => z.risk_level === "red").length;

  const ROLE_LABEL = {
    admin: "System Administrator",
    safety_officer: "Safety Officer",
  };

  return (
    <>
      {/* ── Header ── */}
      <header style={{
        display: "flex", flexWrap: "wrap", justifyContent: "space-between",
        alignItems: "flex-end", gap: 16, paddingBottom: 28,
        borderBottom: "1px solid rgba(91,64,62,0.12)", marginBottom: 32,
        animation: "pfFadeUp 0.4s ease both",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: "#ffb3ad",
              background: "rgba(255,179,173,0.1)", borderRadius: 2,
              padding: "3px 10px", textTransform: "uppercase", letterSpacing: "0.14em",
            }}>{ROLE_LABEL[profile.role] ?? profile.role}</span>
            <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.35,
              textTransform: "uppercase", letterSpacing: "0.12em" }}>
              / ID: ADM-{profile.id?.slice(-4).toUpperCase() ?? "????"}
            </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#e5e2e1",
            margin: "0 0 10px", lineHeight: 1 }}>{profile.name}</h1>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { icon: "history",  val: `Last login: ${timeAgo(profile.last_login)}` },
              { icon: "mail",     val: profile.email ?? "—"                          },
              { icon: "location_on", val: profile.district ?? "All Districts"        },
            ].map(({ icon, val }) => (
              <span key={val} style={{ display: "flex", alignItems: "center",
                gap: 5, fontSize: 11, color: "#e4beba", opacity: 0.55 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
                {val}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PfBtn label="Export Activity" icon="download" onClick={() => {}} />
          <PfBtn label={editing ? "Cancel" : "Edit Profile"} primary
            onClick={() => setEditing(e => !e)} />
        </div>
      </header>

      {/* ── Edit Form ── */}
      {editing && (
        <EditPanel form={editForm} setForm={setEditForm}
          onSave={onSave} saving={saving}
          fields={[
            { key: "name",     label: "Full Name",     type: "text" },
            { key: "email",    label: "Email",          type: "email" },
            { key: "district", label: "District",       type: "text" },
          ]}
        />
      )}

      {/* ── Main grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 28 }}>

        {/* ── Left Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Avatar card */}
          <AvatarCard profile={profile} />

          {/* Active privileges */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4, padding: 22,
            border: "1px solid rgba(91,64,62,0.1)",
            animation: "pfFadeUp 0.4s ease 0.1s both",
          }}>
            <h3 style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
              opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.16em",
              marginBottom: 14 }}>Active Privileges</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {[
                "L4_ACCESS", "ZONE_MGMT", "LOG_DELETION_DISABLED",
                "ROOT_OVERSIGHT",
                ...(profile.role === "safety_officer" ? ["SO_OVERRIDE"] : [])
              ].map(tag => (
                <span key={tag} style={{
                  fontSize: 9, fontWeight: 800, color: "#e4beba",
                  background: "#1c1b1b", borderRadius: 99,
                  border: "1px solid rgba(91,64,62,0.25)",
                  padding: "4px 10px", letterSpacing: "0.08em",
                }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Security config */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4, padding: 22,
            border: "1px solid rgba(91,64,62,0.1)",
            animation: "pfFadeUp 0.4s ease 0.15s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700,
                  color: "#e5e2e1", margin: "0 0 4px" }}>Security Config</h3>
                <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5,
                  margin: 0 }}>Administrative safety protocols</p>
              </div>
              <span className="material-symbols-outlined"
                style={{ fontSize: 26, color: "#e4beba", opacity: 0.1 }}>
                admin_panel_settings
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <SecurityRow icon="phonelink_lock" iconColor="#ffb3ad"
                label="MFA Enabled"
                sub="Hardware token required for all zone approvals"
                enabled={true} />
              <SecurityRow icon="devices" iconColor="#e4beba"
                label="Active Sessions"
                sub="Logged in from 2 devices"
                enabled={true} action="View Details"
                onAction={() => {}} />
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { label: "Managed Zones",       val: zoneCount, icon: "layers",
                sub: `${critZones} critical`,  color: "#ffb3ad" },
              { label: "Assigned Personnel",  val: userCount, icon: "groups",
                sub: "Active field workers",   color: "#ffb95f" },
              { label: "Reports Pending",
                val: useCountUp(auditLog.filter(a => a.status === "pending").length),
                icon: "pending_actions",
                sub: "Awaiting review",        color: "#4edea3" },
            ].map(({ label, val, icon, sub, color }, i) => (
              <div key={label} style={{
                background: "#201f1f", borderRadius: 4, padding: 24,
                border: "1px solid rgba(91,64,62,0.1)",
                position: "relative", overflow: "hidden",
                animation: `pfFadeUp 0.4s ease ${i * 0.07}s both`,
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
                  position: "absolute", top: 12, right: 12, fontSize: 40,
                  color, opacity: 0.07, fontVariationSettings: "'FILL' 1",
                }}>{icon}</span>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  opacity: 0.5, textTransform: "uppercase",
                  letterSpacing: "0.14em", marginBottom: 8 }}>{label}</p>
                <span style={{ fontSize: 52, fontWeight: 800, color: "#e5e2e1",
                  lineHeight: 1, display: "block", marginBottom: 6 }}>{val}</span>
                <span style={{ fontSize: 10, color: "#e4beba",
                  display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%",
                    background: color, display: "inline-block" }} />
                  {sub}
                </span>
              </div>
            ))}
          </div>

          {/* Zone watchlist */}
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 24,
            border: "1px solid rgba(91,64,62,0.1)",
            animation: "pfFadeUp 0.4s ease 0.15s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
                opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Zone Overview
              </h3>
              <button onClick={() => navigate("/analytics")} style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 9, fontWeight: 800, color: "#ffb3ad",
                textDecoration: "underline", letterSpacing: "0.1em",
                textTransform: "uppercase", fontFamily: "Inter",
              }}>View Analytics →</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {zones.slice(0, 8).map((z, i) => {
                const col = z.risk_level === "red" ? "#ff5451"
                  : z.risk_level === "orange" ? "#ffb95f"
                  : z.risk_level === "yellow" ? "#ffeb3b"
                  : "#4edea3";
                return (
                  <button key={z.id ?? i} onClick={() => navigate(`/zones/${z.id}`)} style={{
                    background: "#2a2a2a",
                    border: `1px solid ${col}22`,
                    borderLeft: `3px solid ${col}`,
                    borderRadius: 2, padding: "6px 12px",
                    cursor: "pointer", transition: "all 0.2s",
                    animation: `pfFadeUp 0.3s ease ${i * 0.04}s both`,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
                    onMouseLeave={e => e.currentTarget.style.background = "#2a2a2a"}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%",
                      background: col, animation: z.risk_level === "red"
                        ? "pfPulseDot 2s infinite" : "none" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#e5e2e1",
                      textTransform: "uppercase", letterSpacing: "0.07em" }}>{z.name}</span>
                  </button>
                );
              })}
              {zones.length === 0 && (
                <p style={{ fontSize: 11, color: "#5b403e" }}>No zones assigned</p>
              )}
            </div>
          </div>

          {/* Audit log */}
          <div style={{ animation: "pfFadeUp 0.4s ease 0.2s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
                opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Recent System Actions
              </h3>
              <button style={{ background: "none", border: "none", cursor: "pointer",
                fontSize: 9, fontWeight: 800, color: "#ffb3ad",
                textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter" }}>
                View Full Log
              </button>
            </div>
            <div style={{ background: "#1c1b1b", borderRadius: 4,
              border: "1px solid rgba(91,64,62,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(91,64,62,0.08)" }}>
                    {["Action", "Status", "Time"].map(h => (
                      <th key={h} style={{
                        padding: "12px 20px", textAlign: "left",
                        fontSize: 9, fontWeight: 700, color: "#e4beba", opacity: 0.4,
                        textTransform: "uppercase", letterSpacing: "0.14em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: "24px 20px", textAlign: "center",
                        fontSize: 11, color: "#5b403e" }}>No recent actions</td>
                    </tr>
                  ) : auditLog.map((a, i) => (
                    <AuditRow key={a.id ?? i} item={a} idx={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// FIELD WORKER PROFILE VIEW
// ══════════════════════════════════════════════════════════════
function FieldWorkerProfile({ profile, reports, cracks, auditLog,
  editing, editForm, setEditForm, setEditing, onSave, saving }) {

  const subCount  = useCountUp(reports.length);
  const critCount = useCountUp(cracks.filter(c => (c.ai_risk_score ?? 0) >= 0.8).length);

  // Notification toggles — optimistic local state
  const [notifs, setNotifs] = useState({
    zone_alerts:   true,
    daily_summary: true,
    critical_only: false,
  });
  const toggle = key => setNotifs(n => ({ ...n, [key]: !n[key] }));

  return (
    <>
      {/* ── Header ── */}
      <header style={{
        display: "flex", flexWrap: "wrap", justifyContent: "space-between",
        alignItems: "flex-end", gap: 16, paddingBottom: 28,
        borderBottom: "1px solid rgba(91,64,62,0.12)", marginBottom: 32,
        animation: "pfFadeUp 0.4s ease both",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, color: "#e5e2e1",
              margin: 0, lineHeight: 1 }}>{profile.name}</h1>
            <span style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 9, fontWeight: 800, color: "#4edea3",
              background: "rgba(78,222,163,0.1)", borderRadius: 2,
              border: "1px solid rgba(78,222,163,0.2)", padding: "4px 10px",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%",
                background: "#4edea3", animation: "pfPulseDot 2s infinite" }} />
              On Shift
            </span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { icon: "engineering", val: "Field Worker"                          },
              { icon: "badge",       val: `ID: FW-${profile.id?.slice(-4).toUpperCase() ?? "????"}` },
              { icon: "location_on", val: profile.district ?? "—"                 },
            ].map(({ icon, val }) => (
              <span key={val} style={{ display: "flex", alignItems: "center",
                gap: 5, fontSize: 11, color: "#e4beba", opacity: 0.6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
                {val}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <PfBtn label="Generate Log" icon="download_for_offline" onClick={() => {}} />
          <PfBtn label={editing ? "Cancel" : "Edit Profile"} primary
            onClick={() => setEditing(e => !e)} />
        </div>
      </header>

      {/* ── Edit Form ── */}
      {editing && (
        <EditPanel form={editForm} setForm={setEditForm}
          onSave={onSave} saving={saving}
          fields={[
            { key: "name",          label: "Full Name",       type: "text"  },
            { key: "email",         label: "Email",            type: "email" },
            { key: "district",      label: "District",         type: "text"  },
            { key: "zone_assigned", label: "Assigned Zone ID", type: "text"  },
          ]}
        />
      )}

      {/* ── Layout grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 28 }}>

        {/* ── Left ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Avatar card */}
          <AvatarCard profile={profile} />

          {/* Field details */}
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 22,
            border: "1px solid rgba(91,64,62,0.1)",
            animation: "pfFadeUp 0.4s ease 0.1s both",
          }}>
            {[
              { label: "Assigned District",
                content: (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 18, color: "#ffb3ad" }}>distance</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1" }}>
                      {profile.district ?? "—"}
                    </span>
                  </div>
                )},
              { label: "Active Zones",
                content: (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {profile.zone_assigned
                      ? [profile.zone_assigned].map(z => (
                          <span key={z} style={{
                            background: "#2a2a2a", borderRadius: 2,
                            border: "1px solid rgba(91,64,62,0.2)",
                            padding: "4px 10px", fontSize: 10,
                            fontWeight: 700, color: "#e5e2e1",
                          }}>{z}</span>
                        ))
                      : <span style={{ fontSize: 11, color: "#5b403e" }}>None assigned</span>
                    }
                  </div>
                )},
              { label: "Contact",
                content: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { icon: "mail", val: profile.email ?? "—" },
                    ].map(({ icon, val }) => (
                      <div key={val} style={{ display: "flex", alignItems: "center",
                        gap: 6, fontSize: 11, color: "#e4beba", opacity: 0.7 }}>
                        <span className="material-symbols-outlined"
                          style={{ fontSize: 14 }}>{icon}</span>
                        {val}
                      </div>
                    ))}
                  </div>
                )},
            ].map(({ label, content }, i) => (
              <div key={label} style={{ marginBottom: i < 2 ? 20 : 0 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  opacity: 0.45, textTransform: "uppercase",
                  letterSpacing: "0.14em", marginBottom: 8 }}>{label}</p>
                {content}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <StatCard
              label="Submissions" val={subCount} icon="analytics" color="#ffb3ad"
              sub="Reports this month" accentBorder="#ffb3ad" idx={0}
            />
            <StatCard
              label="Critical Detections" val={critCount} icon="warning"
              color="#ffb4ab" sub="Verified crack formations" accentBorder="#ffb4ab"
              idx={1}
            />
          </div>

          {/* Notification protocols */}
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 24,
            border: "1px solid rgba(91,64,62,0.1)",
            animation: "pfFadeUp 0.4s ease 0.12s both",
          }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 18 }}>
              Notification Protocols
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { key: "zone_alerts",   icon: "sensors",       iconColor: "#e4beba",
                  label: "New Zone Alerts",
                  sub: "Instant push for spatial reassignments" },
                { key: "daily_summary", icon: "summarize",     iconColor: "#e4beba",
                  label: "Daily Summary",
                  sub: "EOD activity compilation via secure mail" },
                { key: "critical_only", icon: "priority_high", iconColor: "#ffb4ab",
                  label: "Critical Hazards Only",
                  sub: "Override silent mode for seismic anomalies" },
              ].map(({ key, icon, iconColor, label, sub }, i) => (
                <div key={key} style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center",
                  background: "#2a2a2a", borderRadius: 4, padding: "14px 16px",
                  animation: `pfFadeUp 0.3s ease ${0.1 + i * 0.05}s both`,
                  transition: "background 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
                  onMouseLeave={e => e.currentTarget.style.background = "#2a2a2a"}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 2,
                      background: "rgba(255,179,173,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span className="material-symbols-outlined"
                        style={{ fontSize: 18, color: iconColor }}>{icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#e5e2e1",
                        margin: "0 0 2px" }}>{label}</p>
                      <p style={{ fontSize: 9, color: "#e4beba",
                        opacity: 0.5, margin: 0 }}>{sub}</p>
                    </div>
                  </div>
                  <Toggle on={notifs[key]} onClick={() => toggle(key)} />
                </div>
              ))}
            </div>
          </div>

          {/* Activity log */}
          <div style={{ animation: "pfFadeUp 0.4s ease 0.18s both" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 12, padding: "0 2px" }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
                opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Activity Log
              </h3>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#ffb3ad",
                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                View Full Archive
              </span>
            </div>
            <div style={{ background: "#201f1f", borderRadius: 4,
              border: "1px solid rgba(91,64,62,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#2a2a2a",
                    borderBottom: "1px solid rgba(91,64,62,0.08)" }}>
                    {["Status","Description","Time","Reference"].map((h, j) => (
                      <th key={h} style={{
                        padding: "12px 18px",
                        textAlign: j === 3 ? "right" : "left",
                        fontSize: 9, fontWeight: 700, color: "#e4beba",
                        opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.14em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditLog.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: "24px 18px", textAlign: "center",
                        fontSize: 11, color: "#5b403e" }}>No recent activity</td>
                    </tr>
                  ) : auditLog.map((a, i) => {
                    const sev = a.status;
                    const col = sev === "critical" ? "#ff5451"
                      : sev === "high" ? "#ffb3ad"
                      : sev === "medium" ? "#ffb95f"
                      : "#4edea3";
                    const sevLabel = (sev ?? "routine").charAt(0).toUpperCase() + (sev ?? "routine").slice(1);
                    return (
                      <tr key={a.id ?? i} style={{
                        borderBottom: "1px solid rgba(91,64,62,0.05)",
                        transition: "background 0.15s",
                        animation: `pfFadeUp 0.3s ease ${i * 0.04}s both`,
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "14px 18px" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 800, color: col,
                            background: `${col}18`, borderRadius: 2,
                            padding: "3px 8px", textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}>{sevLabel}</span>
                        </td>
                        <td style={{ padding: "14px 18px", fontSize: 12,
                          fontWeight: 600, color: "#e5e2e1" }}>{a.label}</td>
                        <td style={{ padding: "14px 18px", fontSize: 10,
                          color: "#e4beba", opacity: 0.5,
                          fontFamily: "monospace" }}>{timeAgo(a.ts)}</td>
                        <td style={{ padding: "14px 18px", textAlign: "right",
                          fontSize: 10, color: "#e4beba", opacity: 0.4 }}>
                          {a.ref ?? `#${a.id?.slice(-6).toUpperCase() ?? "——"}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

// ── Avatar Card ──
function AvatarCard({ profile }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  return (
    <div style={{
      background: "rgba(42,42,42,0.7)", backdropFilter: "blur(16px)",
      borderRadius: 4, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.04)",
      animation: "pfFadeUp 0.4s ease 0.05s both",
    }}>
      {/* Photo */}
      <div style={{ height: 220, background: "#1c1b1b",
        position: "relative", cursor: "pointer", overflow: "hidden" }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {profile.avatar_url && !imgErr ? (
          <img src={profile.avatar_url} alt={profile.name}
            onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover",
              transition: "transform 0.6s", transform: hov ? "scale(1.05)" : "scale(1)" }} />
        ) : (
          <div style={{ width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(255,179,173,0.1)",
              border: "2px solid rgba(255,179,173,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#ffb3ad" }}>
                {initials(profile.name)}
              </span>
            </div>
          </div>
        )}
        {/* Hover overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 6,
          opacity: hov ? 1 : 0, transition: "opacity 0.3s",
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 28, color: "#fff" }}>photo_camera</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: "#fff",
            textTransform: "uppercase", letterSpacing: "0.12em" }}>Update Photo</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 20 }}>
        <p style={{ fontSize: 9, fontWeight: 700, color: "#e4beba", opacity: 0.4,
          textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 14 }}>
          Personnel Information
        </p>
        {[
          { icon: "mail",      val: profile.email    ?? "—", label: "Email"      },
          { icon: "location_on", val: profile.district ?? "—", label: "District"  },
          { icon: "schedule",  val: `Member since ${profile.created_at
            ? new Date(profile.created_at).getFullYear() : "—"}`, label: "Tenure" },
        ].map(({ icon, val, label }) => (
          <div key={label} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 18, color: "#ffb3ad", marginTop: 1 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.4,
                textTransform: "uppercase", letterSpacing: "0.1em",
                margin: "0 0 2px" }}>{label}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#e5e2e1",
                margin: 0 }}>{val}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Edit Panel ──
function EditPanel({ form, setForm, onSave, saving, fields }) {
  return (
    <div style={{
      background: "#2a2a2a", borderRadius: 4, padding: 24, marginBottom: 24,
      border: "1px solid rgba(255,179,173,0.15)",
      borderLeft: "3px solid #ffb3ad",
      animation: "pfSlideDown 0.3s ease both",
    }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#ffb3ad",
        textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
        Edit Profile
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
              opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.12em",
              display: "block", marginBottom: 5 }}>{label}</label>
            <input type={type} value={form[key] ?? ""} placeholder={label}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              style={{
                width: "100%", background: "#1c1b1b",
                border: "1px solid rgba(91,64,62,0.25)", borderRadius: 2,
                padding: "9px 12px", color: "#e5e2e1", fontSize: 12,
                fontFamily: "Inter", outline: "none",
                boxSizing: "border-box", transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.25)"}
            />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <PfBtn label={saving ? "Saving…" : "Save Changes"} primary
          onClick={onSave} disabled={saving} />
      </div>
    </div>
  );
}

// ── Security Row ──
function SecurityRow({ icon, iconColor, label, sub, enabled, action, onAction }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "#1c1b1b", borderRadius: 4, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 2,
          background: "rgba(255,179,173,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 18, color: iconColor }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#e5e2e1",
            margin: "0 0 2px" }}>{label}</p>
          <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.45,
            margin: 0 }}>{sub}</p>
        </div>
      </div>
      {action
        ? <button onClick={onAction} style={{
            fontSize: 9, fontWeight: 800, color: "#ffb3ad",
            border: "1px solid rgba(255,179,173,0.2)", borderRadius: 2,
            padding: "5px 12px", background: "none", cursor: "pointer",
            fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.1em",
          }}>{action}</button>
        : <Toggle on={enabled} />
      }
    </div>
  );
}

// ── Audit Row ──
function AuditRow({ item: a, idx }) {
  const col = a.color ?? "#4edea3";
  const statusLabel = (a.status ?? "ok")
    .replace("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase());
  return (
    <tr style={{
      borderBottom: "1px solid rgba(91,64,62,0.05)",
      transition: "background 0.15s",
      animation: `pfFadeUp 0.3s ease ${idx * 0.04}s both`,
    }}
      onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "14px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 18, color: col }}>{a.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e2e1" }}>{a.label}</span>
        </div>
      </td>
      <td style={{ padding: "14px 20px" }}>
        <span style={{
          fontSize: 9, fontWeight: 800, color: col,
          background: `${col}18`, borderRadius: 2,
          padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.08em",
        }}>{statusLabel}</span>
      </td>
      <td style={{ padding: "14px 20px", fontSize: 11,
        color: "#e4beba", opacity: 0.4, fontFamily: "monospace" }}>
        {timeAgo(a.ts)}
      </td>
    </tr>
  );
}

// ── Stat Card ──
function StatCard({ label, val, icon, color, sub, accentBorder, idx }) {
  return (
    <div style={{
      background: "#2a2a2a", borderRadius: 4, padding: 24,
      borderLeft: `3px solid ${accentBorder}`,
      border: "1px solid rgba(91,64,62,0.1)",
      position: "relative", overflow: "hidden",
      animation: `pfFadeUp 0.4s ease ${idx * 0.08}s both`,
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
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color,
            textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 8px" }}>
            {label}
          </p>
          <span style={{ fontSize: 52, fontWeight: 800, color,
            lineHeight: 1, display: "block" }}>{val}</span>
        </div>
        <span className="material-symbols-outlined"
          style={{ fontSize: 28, color, opacity: 0.2,
            fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5, marginTop: 8 }}>{sub}</p>
    </div>
  );
}

// ── Toggle ──
function Toggle({ on, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: 42, height: 22, borderRadius: 99, cursor: "pointer",
      background: on ? "#ffb3ad" : "#3a3939",
      border: `1px solid ${on ? "rgba(255,179,173,0.4)" : "rgba(91,64,62,0.3)"}`,
      position: "relative", transition: "background 0.25s, border-color 0.25s",
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 3,
        left: on ? "calc(100% - 17px)" : 3,
        width: 14, height: 14, borderRadius: "50%",
        background: on ? "#68000a" : "#5b403e",
        transition: "left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

// ── Button ──
function PfBtn({ label, icon, primary, onClick, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "10px 20px", borderRadius: 2, border: "none",
        cursor: disabled ? "wait" : "pointer", fontFamily: "Inter",
        fontSize: 10, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: "0.12em", transition: "all 0.2s",
        opacity: disabled ? 0.6 : 1,
        background: primary
          ? hov ? "rgba(255,84,81,0.9)"
               : "linear-gradient(135deg,#ffb3ad,#ff5451)"
          : hov ? "#3a3939" : "#2a2a2a",
        color: primary ? "#68000a" : "#e4beba",
        boxShadow: primary ? "0 4px 16px rgba(255,84,81,0.25)" : "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
      }}>
      {icon && <span className="material-symbols-outlined"
        style={{ fontSize: 15 }}>{icon}</span>}
      {label}
    </button>
  );
}

// ── Skeleton ──
function ProfileSkeleton() {
  return (
    <div style={{ padding: "32px", fontFamily: "Inter" }}>
      <div style={{ height: 48, width: 280, background: "#2a2a2a",
        borderRadius: 4, marginBottom: 32,
        animation: "pfShimmer 1.4s ease infinite alternate" }} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 28 }}>
        <div style={{ height: 380, background: "#2a2a2a", borderRadius: 4,
          animation: "pfShimmer 1.4s ease 0.1s infinite alternate" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[200, 240, 180].map((h, i) => (
            <div key={i} style={{ height: h, background: "#2a2a2a", borderRadius: 4,
              animation: `pfShimmer 1.4s ease ${i * 0.1}s infinite alternate` }} />
          ))}
        </div>
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  @keyframes pfFadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pfSlideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pfShimmer   { from{opacity:0.2} to{opacity:0.5} }
  @keyframes pfPulseDot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.75)} }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 100px #1c1b1b inset !important;
    -webkit-text-fill-color: #e5e2e1 !important;
  }
  ::-webkit-scrollbar { width: 3px }
  ::-webkit-scrollbar-track { background: #0e0e0e }
  ::-webkit-scrollbar-thumb { background: #3a3939; border-radius: 4px }
`;
