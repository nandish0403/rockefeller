import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import { fetchZones } from "../../api/zones";

// ── constants ──────────────────────────────────────────────────
const SEV_CFG = {
  critical: { color: "#ff5451", label: "Critical Risk" },
  high:     { color: "#ffb95f", label: "High Risk"     },
  moderate: { color: "#ffeb3b", label: "Moderate"      },
  low:      { color: "#4edea3", label: "Low Risk"      },
};

const CRACK_TYPES = [
  { v: "tension_crack",    l: "Tension Crack"    },
  { v: "parallel",         l: "Parallel Crack"   },
  { v: "perpendicular",    l: "Perpendicular"    },
  { v: "surface_fracture", l: "Surface Fracture" },
  { v: "rockfall_sign",    l: "Rockfall Sign"    },
  { v: "water_seepage",    l: "Water Seepage"    },
  { v: "water_stream",     l: "Water Stream"     },
  { v: "soil_saturation",  l: "Soil Saturation"  },
  { v: "other",            l: "Other"            },
];

function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ══════════════════════════════════════════════════════════════
// ROOT — role switch
// ══════════════════════════════════════════════════════════════
export default function CrackReportsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "safety_officer";
  return isAdmin ? <AdminCrackReports /> : <FieldWorkerUpload />;
}

// ══════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════
function AdminCrackReports() {
  const navigate   = useNavigate();
  const [reports,  setReports]   = useState([]);
  const [loading,  setLoading]   = useState(true);
  const [mounted,  setMounted]   = useState(false);
  const [actioning,setActioning] = useState(null);
  const [fZone,    setFZone]     = useState("All");
  const [fSev,     setFSev]      = useState("All");
  const [fType,    setFType]     = useState("All");
  const [fStatus,  setFStatus]   = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/crack-reports");
      setReports(data ?? []);
    } catch { setReports([]); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  const doAction = async (id, action) => {
    setActioning(id + action);
    try { await api.patch(`/api/crack-reports/${id}/review`, { engineer_action: action }); await load(); }
    finally { setActioning(null); }
  };

  const total    = reports.length;
  const critical = reports.filter(r => r.severity === "critical" || (r.ai_risk_score ?? 0) >= 0.8).length;
  const pending  = reports.filter(r => r.status === "pending" || r.status === "ai_scored").length;
  const resolved = reports.filter(r => r.status === "reviewed" || r.status === "closed").length;

  const zones   = ["All", ...new Set(reports.map(r => r.zone_name).filter(Boolean))];
  const visible = reports.filter(r => {
    if (fZone   !== "All" && r.zone_name  !== fZone)             return false;
    if (fSev    !== "All" && r.severity   !== fSev.toLowerCase()) return false;
    if (fType   !== "All" && r.crack_type !== fType)             return false;
    if (fStatus !== "All" && r.status     !== fStatus.toLowerCase()) return false;
    return true;
  });

  return (
    <div style={{
      padding: "32px 32px 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}>

      {/* ── KPI Row ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20, marginBottom: 28 }}>
        {[
          { label: "Total Reports",  val: total,    icon: "description",     col: "#ffb3ad", accent: null        },
          { label: "Critical Risk",  val: critical, icon: "warning",         col: "#ff5451", accent: "#ff5451"   },
          { label: "Pending Review", val: pending,  icon: "pending_actions", col: "#ffb95f", accent: null        },
          { label: "Resolved",       val: resolved, icon: "check_circle",    col: "#4edea3", accent: null        },
        ].map(({ label, val, icon, col, accent }, i) => (
          <div key={label} style={{
            background: "#2a2a2a", borderRadius: 4, padding: "20px 24px",
            border: accent ? `1px solid ${accent}33` : "1px solid rgba(91,64,62,0.1)",
            borderLeft: accent ? `4px solid ${accent}` : undefined,
            position: "relative", overflow: "hidden",
            animation: `crFadeUp 0.4s ease ${i * 0.07}s both`,
            transition: "transform 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.6,
              textTransform: "uppercase", letterSpacing: "0.15em",
              fontWeight: 700, display: "block", marginBottom: 8 }}>{label}</span>
            <span style={{ fontSize: 40, fontWeight: 800, color: col, lineHeight: 1 }}>
              {loading ? "—" : val}
            </span>
            <span className="material-symbols-outlined" style={{
              position: "absolute", top: 16, right: 16, fontSize: 32,
              color: col, opacity: 0.12, fontVariationSettings: "'FILL' 1",
            }}>{icon}</span>
          </div>
        ))}
      </section>

      {/* ── Filter bar ── */}
      <section style={{
        background: "#201f1f", borderRadius: 4,
        border: "1px solid rgba(91,64,62,0.1)",
        padding: "16px 20px", display: "flex",
        flexWrap: "wrap", alignItems: "flex-end", gap: 16, marginBottom: 28,
        animation: "crSlideDown 0.4s ease 0.1s both",
      }}>
        {[
          { label: "Zone",       val: fZone,   set: setFZone,   opts: zones.map(z => ({ v: z, l: z })) },
          { label: "Severity",   val: fSev,    set: setFSev,    opts: ["All","Critical","High","Moderate","Low"].map(s=>({v:s,l:s})) },
          { label: "Crack Type", val: fType,   set: setFType,   opts: [{ v:"All", l:"All Types" }, ...CRACK_TYPES] },
          { label: "Status",     val: fStatus, set: setFStatus, opts: ["All","Pending","Ai_scored","Reviewed","Closed"].map(s=>({v:s,l:s.replace("_"," ")})) },
        ].map(({ label, val, set, opts }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 140 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.15em" }}>{label}</span>
            <div style={{ position: "relative" }}>
              <select value={val} onChange={e => set(e.target.value)} style={{
                background: "#1c1b1b", border: "none", color: "#e5e2e1",
                fontSize: 12, padding: "8px 28px 8px 10px",
                fontFamily: "Inter", outline: "none", borderRadius: 2,
                appearance: "none", cursor: "pointer", width: "100%",
              }}>
                {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
              <span className="material-symbols-outlined" style={{
                position: "absolute", right: 6, top: "50%",
                transform: "translateY(-50%)", fontSize: 14,
                color: "#e4beba", pointerEvents: "none",
              }}>expand_more</span>
            </div>
          </div>
        ))}
        <button onClick={load} style={{
          marginLeft: "auto",
          background: "linear-gradient(135deg, #ffb3ad, #ff5451)",
          color: "#68000a", border: "none", borderRadius: 2,
          padding: "9px 24px", fontSize: 10, fontWeight: 800,
          textTransform: "uppercase", letterSpacing: "0.15em",
          cursor: "pointer", fontFamily: "Inter", transition: "opacity 0.2s",
          boxShadow: "0 4px 16px rgba(255,84,81,0.2)",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
          Apply Filters
        </button>
      </section>

      {/* ── Skeleton ── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 24 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{
              height: 320, background: "#2a2a2a", borderRadius: 4,
              animation: `crShimmer 1.4s ease ${i*0.1}s infinite alternate`,
            }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0", animation: "crFadeUp 0.4s ease both" }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 52, color: "#3a3939", display: "block", marginBottom: 16 }}>
            running_with_errors
          </span>
          <p style={{ fontSize: 11, color: "#5b403e",
            textTransform: "uppercase", letterSpacing: "0.12em" }}>No reports found</p>
        </div>
      )}

      {/* ── Cards ── */}
      {!loading && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 24 }}>
          {visible.map((r, i) => (
            <AdminReportCard key={r.id ?? i} report={r} idx={i}
              onAction={doAction} actioning={actioning}
              onView={() => navigate(`/crack-reports/${r.id}`)} />
          ))}
        </section>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── Admin card ─────────────────────────────────────────────────
function AdminReportCard({ report: r, idx, onAction, actioning, onView }) {
  const [imgErr, setImgErr] = useState(false);
  const sev   = SEV_CFG[r.severity] ?? SEV_CFG.low;
  const score = r.ai_risk_score != null ? Math.round(r.ai_risk_score * 100) : null;
  const scoreColor = !score ? "#4edea3"
    : score >= 80 ? "#ff5451" : score >= 60 ? "#ffb95f" : "#4edea3";

  return (
    <div style={{
      background: "#2a2a2a", borderRadius: 4,
      border: "1px solid rgba(91,64,62,0.12)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      animation: `crFadeUp 0.4s ease ${idx * 0.05}s both`,
      transition: "transform 0.25s, box-shadow 0.25s",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.45)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Photo */}
      <div style={{ height: 180, position: "relative", overflow: "hidden", flexShrink: 0, background: "#1c1b1b" }}>
        {r.photo_url && !imgErr ? (
          <img src={r.photo_url} alt="crack" onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
            onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#3a3939" }}>image_not_supported</span>
            <span style={{ fontSize: 9, color: "#5b403e", textTransform: "uppercase", letterSpacing: "0.1em" }}>No photo</span>
          </div>
        )}
        {/* Sev badge */}
        <div style={{
          position: "absolute", top: 12, left: 12,
          background: `${sev.color}22`, backdropFilter: "blur(8px)",
          border: `1px solid ${sev.color}55`, borderRadius: 2, padding: "4px 10px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: sev.color,
            textTransform: "uppercase", letterSpacing: "0.1em" }}>{sev.label}</span>
        </div>
        {/* ID */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          background: "rgba(14,14,14,0.85)", backdropFilter: "blur(8px)",
          borderRadius: 2, padding: "3px 8px",
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba", fontFamily: "monospace" }}>
            {r.id?.slice(-6).toUpperCase() ?? "——"}
          </span>
        </div>
        {/* Score */}
        {score !== null && (
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            background: "rgba(14,14,14,0.85)", backdropFilter: "blur(8px)",
            borderRadius: 2, padding: "3px 8px",
            border: `1px solid ${scoreColor}33`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: scoreColor, fontFamily: "monospace" }}>
              {score}%
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1", margin: "0 0 4px" }}>
              {r.zone_name}
            </h3>
            <p style={{ fontSize: 11, color: "#e4beba", opacity: 0.7, margin: 0 }}>
              {r.crack_type?.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
            </p>
          </div>
          {score !== null && (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor, lineHeight: 1, display: "block" }}>
                {score}%
              </span>
              <span style={{ fontSize: 8, color: "#e4beba", opacity: 0.5,
                textTransform: "uppercase", letterSpacing: "0.1em" }}>AI Risk</span>
            </div>
          )}
        </div>

        {/* Bar */}
        {score !== null && (
          <div style={{ height: 3, background: "#1c1b1b", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${score}%`, background: scoreColor,
              borderRadius: 99, boxShadow: `0 0 8px ${scoreColor}`,
              animation: "crBarGrow 0.8s ease both",
            }} />
          </div>
        )}

        {/* AI class tag */}
        {r.ai_severity_class && (
          <div style={{
            background: "rgba(255,179,173,0.06)",
            border: "1px solid rgba(255,179,173,0.12)",
            borderRadius: 2, padding: "6px 10px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 13, color: "#ffb3ad", fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            <span style={{ fontSize: 10, color: "#ffb3ad", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI: {r.ai_severity_class}
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{
          paddingTop: 12, borderTop: "1px solid rgba(91,64,62,0.12)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#3a3939", border: "1px solid rgba(255,179,173,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#e4beba" }}>person</span>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1", margin: 0 }}>{r.reported_by}</p>
              <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.5, margin: 0, textTransform: "capitalize" }}>
                {timeAgo(r.created_at)} • {r.status?.replace("_"," ")}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(r.status === "pending" || r.status === "ai_scored") && (
              <>
                <TinyBtn label="✓ Safe" color="#4edea3"
                  loading={actioning === r.id + "confirmed_safe"}
                  onClick={() => onAction(r.id, "confirmed_safe")} />
                <TinyBtn label="Review" primary
                  loading={actioning === r.id + "confirmed_critical"}
                  onClick={onView} />
              </>
            )}
            {(r.status === "reviewed" || r.status === "closed") && (
              <span style={{ fontSize: 10, color: "#4edea3", fontWeight: 700,
                display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {r.status === "closed" ? "Closed" : "Reviewed"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TinyBtn({ label, color = "#ffb3ad", onClick, loading, primary }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "6px 12px", borderRadius: 2,
      background: primary ? "linear-gradient(135deg,#ffb3ad,#ff5451)" : "transparent",
      border: primary ? "none" : `1px solid ${color}44`,
      color: primary ? "#68000a" : color,
      fontSize: 9, fontWeight: 800, fontFamily: "Inter",
      textTransform: "uppercase", letterSpacing: "0.08em",
      cursor: loading ? "wait" : "pointer",
      opacity: loading ? 0.5 : 1, transition: "all 0.2s",
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
    >
      {loading
        ? <span style={{ width: 8, height: 8, border: "1.5px solid rgba(228,190,186,0.3)",
            borderTopColor: "#e4beba", borderRadius: "50%", display: "inline-block",
            animation: "crSpin 0.7s linear infinite" }} />
        : label}
    </button>
  );
}


// ══════════════════════════════════════════════════════════════
// FIELD WORKER VIEW — multi-step upload
// ══════════════════════════════════════════════════════════════
const STEPS = ["Zone", "Details", "Media", "Review"];

function FieldWorkerUpload() {
  const { currentUser } = useAuth();
  const [mounted,    setMounted]    = useState(false);
  const navigate = useNavigate();
  const [step,       setStep]       = useState(0);
  const [activeTab,  setActiveTab]  = useState("crack"); // "crack" | "field"
  const [zones,      setZones]      = useState([]);
  const [zoneSearch, setZoneSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [submitId,   setSubmitId]   = useState("");
  const fileRef = useRef(null);

  // form state
  const [form, setForm] = useState({
    zone_id:   "",
    zone_name: "",
    zone_risk: "",
    crack_type: "tension_crack",
    severity:   "low",
    remarks:    "",
    photo:      null,
    photoPreview: null,
    coords:     null,
  });

  useEffect(() => {
    setTimeout(() => setMounted(true), 60);
    fetchZones().then(setZones).catch(() => {});
    // Try geolocation
    navigator.geolocation?.getCurrentPosition(pos =>
      setForm(f => ({ ...f, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }))
    );
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filteredZones = zones.filter(z =>
    !zoneSearch || z.name?.toLowerCase().includes(zoneSearch.toLowerCase()) ||
    z.id?.toLowerCase().includes(zoneSearch.toLowerCase())
  );

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set("photo", file);
    const reader = new FileReader();
    reader.onload = ev => set("photoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    set("photo", file);
    const reader = new FileReader();
    reader.onload = ev => set("photoPreview", ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("zone_id",    form.zone_id);
      fd.append("zone_name",  form.zone_name);
      fd.append("crack_type", form.crack_type);
      fd.append("severity",   form.severity);
      if (form.remarks) fd.append("remarks", form.remarks);
      if (form.coords)  fd.append("coords", JSON.stringify(form.coords));
      if (form.photo)   fd.append("photo", form.photo);
      const { data } = await api.post("/api/crack-reports", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitId(data?.id?.slice(-8).toUpperCase() ?? "—");
      setSuccess(true);
    } catch { alert("Submit failed. Try again."); }
    finally { setSubmitting(false); }
  };

  const resetAll = () => {
    setForm({ zone_id:"", zone_name:"", zone_risk:"", crack_type:"tension_crack",
      severity:"low", remarks:"", photo:null, photoPreview:null, coords:null });
    setStep(0); setSuccess(false); setSubmitId("");
  };

  const canNext = () => {
    if (step === 0) return !!form.zone_id;
    if (step === 1) return !!form.crack_type && !!form.severity;
    if (step === 2) return !!form.photo;
    return true;
  };

  return (
    <div style={{
      padding: "32px 0 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 32px" }}>

        {/* ── Tab toggle ── */}
        <div style={{
          display: "flex", gap: 4, background: "#0e0e0e",
          padding: 4, borderRadius: 4, marginBottom: 28,
          animation: "crFadeUp 0.4s ease both",
        }}>
          {[
            { id: "crack", icon: "running_with_errors", label: "Crack Report" },
            { id: "field", icon: "edit_document",       label: "Field Report" },
          ].map(t => (
            <button key={t.id} onClick={() =>{
            if (t.id === "field") navigate("/field-report");  // ← CHANGE
            else setActiveTab(t.id);    
             }}
            
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "12px 16px", borderRadius: 2, border: "none",
              fontFamily: "Inter", fontSize: 10, fontWeight: 800,
              textTransform: "uppercase", letterSpacing: "0.15em",
              cursor: "pointer", transition: "all 0.2s",
              background: activeTab === t.id ? "rgba(255,84,81,0.1)" : "transparent",
              color: activeTab === t.id ? "#ffb3ad" : "#e4beba",
              borderBottom: activeTab === t.id ? "2px solid #ffb3ad" : "2px solid transparent",
            }}>
              <span className="material-symbols-outlined" style={{
                fontSize: 16,
                fontVariationSettings: activeTab === t.id ? "'FILL' 1" : "'FILL' 0",
              }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Stepper ── */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", position: "relative",
          marginBottom: 40, padding: "0 16px",
          animation: "crFadeUp 0.4s ease 0.05s both",
        }}>
          {/* connector line */}
          <div style={{
            position: "absolute", top: 16, left: "10%", width: "80%",
            height: 1, background: "rgba(91,64,62,0.12)", zIndex: 0,
          }} />
          {/* progress fill */}
          <div style={{
            position: "absolute", top: 16, left: "10%",
            width: `${(step / (STEPS.length - 1)) * 80}%`,
            height: 1, background: "#ffb3ad", zIndex: 1,
            transition: "width 0.4s ease",
          }} />
          {STEPS.map((label, i) => (
            <div key={label} style={{ display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8, position: "relative", zIndex: 2 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: i < step ? "#ffb3ad"
                  : i === step ? "linear-gradient(135deg,#ffb3ad,#ff5451)"
                  : "#2a2a2a",
                border: i > step ? "1px solid rgba(91,64,62,0.3)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 12, fontFamily: "Inter",
                color: i <= step ? "#68000a" : "#5b403e",
                boxShadow: i === step ? "0 0 16px rgba(255,179,173,0.35)" : "none",
                transition: "all 0.3s ease",
              }}>
                {i < step
                  ? <span className="material-symbols-outlined"
                      style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check</span>
                  : i + 1}
              </div>
              <span style={{ fontSize: 9, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: i === step ? "#ffb3ad" : i < step ? "#e4beba" : "#5b403e",
                transition: "color 0.3s",
              }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Step panel ── */}
        <div style={{
          background: "#2a2a2a", borderRadius: 4,
          border: "1px solid rgba(91,64,62,0.12)",
          overflow: "hidden", position: "relative",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
          animation: "crFadeUp 0.35s ease 0.1s both",
        }}>
          {/* Top accent bar */}
          <div style={{
            height: 3,
            background: "linear-gradient(90deg,#ffb3ad,#ff5451,#ffb95f)",
            backgroundSize: "200% 100%",
            animation: "crGradientSlide 3s ease infinite",
          }} />

          <div style={{ padding: "32px 32px 0" }}>
            {step === 0 && <StepZone zones={filteredZones}
              search={zoneSearch} onSearch={setZoneSearch}
              selected={form.zone_id} onSelect={(z) => {
                set("zone_id",   z.id);
                set("zone_name", z.name);
                set("zone_risk", z.risk_color ?? "");
              }} />}
            {step === 1 && <StepDetails form={form} set={set} />}
            {step === 2 && <StepMedia form={form} fileRef={fileRef}
              onFile={handlePhoto} onDrop={handleDrop} />}
            {step === 3 && <StepReview form={form} user={currentUser} />}
          </div>

          {/* ── Footer ── */}
          <div style={{
            margin: "28px 32px 32px", paddingTop: 20,
            borderTop: "1px solid rgba(91,64,62,0.1)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{
                padding: "10px 24px", borderRadius: 2,
                background: "transparent", border: "none",
                color: step === 0 ? "#3a3939" : "#e4beba",
                fontSize: 10, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.12em",
                cursor: step === 0 ? "default" : "pointer", fontFamily: "Inter",
                transition: "all 0.2s",
              }}>
              ← Back
            </button>

            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)}
                disabled={!canNext()}
                style={{
                  padding: "11px 36px", borderRadius: 2, border: "none",
                  background: canNext()
                    ? "linear-gradient(135deg,#ffb3ad,#ff5451)"
                    : "#2a2a2a",
                  color: canNext() ? "#68000a" : "#5b403e",
                  fontSize: 10, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                  cursor: canNext() ? "pointer" : "default",
                  fontFamily: "Inter", transition: "all 0.25s",
                  boxShadow: canNext() ? "0 4px 20px rgba(255,84,81,0.25)" : "none",
                }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} style={{
                padding: "11px 36px", borderRadius: 2, border: "none",
                background: "linear-gradient(135deg,#4edea3,#00a572)",
                color: "#002113", fontSize: 10, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.15em",
                cursor: submitting ? "wait" : "pointer",
                fontFamily: "Inter", transition: "all 0.25s",
                boxShadow: "0 4px 20px rgba(78,222,163,0.25)",
                opacity: submitting ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {submitting && (
                  <span style={{ width: 10, height: 10,
                    border: "2px solid rgba(0,33,19,0.3)", borderTopColor: "#002113",
                    borderRadius: "50%", display: "inline-block",
                    animation: "crSpin 0.7s linear infinite" }} />
                )}
                {submitting ? "Submitting…" : "Submit to AI"}
              </button>
            )}
          </div>
        </div>

        {/* ── Contextual grayscale preview ── */}
        <div style={{ marginTop: 40, opacity: 0.35, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.2em" }}>
              Contextual Monitoring
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(91,64,62,0.1)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, height: 100 }}>
            <div style={{ background: "#201f1f", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%",
                background: "linear-gradient(135deg,#1c1b1b,#2a2a2a)",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#3a3939" }}>satellite</span>
              </div>
            </div>
            <div style={{ background: "#201f1f", borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#3a3939" }}>analytics</span>
            </div>
            <div style={{ background: "#201f1f", borderRadius: 4,
              display: "flex", flexDirection: "column",
              justifyContent: "center", padding: "12px 16px" }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: "#ffb3ad",
                textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>
                Stability Index
              </span>
              <div style={{ height: 3, background: "#1c1b1b", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: "72%", height: "100%",
                  background: "#ffb3ad", borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success overlay ── */}
      {success && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, animation: "crFadeIn 0.3s ease both",
        }}>
          <div style={{
            background: "#2a2a2a", borderRadius: 8,
            maxWidth: 400, width: "100%", padding: 48,
            textAlign: "center",
            border: "1px solid rgba(78,222,163,0.2)",
            boxShadow: "0 0 80px rgba(0,0,0,0.8), 0 0 40px rgba(78,222,163,0.08)",
            animation: "crPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            {/* Animated checkmark ring */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(78,222,163,0.08)",
              border: "1px solid rgba(78,222,163,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
              animation: "crPulseRing 2s ease infinite",
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 44, color: "#4edea3", fontVariationSettings: "'FILL' 1",
                  animation: "crCheckBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}>
                check_circle
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e5e2e1", marginBottom: 8 }}>
              Report Submitted
            </h2>
            <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.7,
              marginBottom: 32, lineHeight: 1.7 }}>
              Incident <span style={{ color: "#ffb3ad", fontWeight: 700 }}>
                #RCK-{submitId}
              </span> has been recorded and queued for AI analysis.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setSuccess(false)} style={{
                padding: 16, background: "#201f1f", border: "none",
                borderRadius: 2, color: "#e5e2e1", fontSize: 10, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.12em",
                cursor: "pointer", fontFamily: "Inter", transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
                onMouseLeave={e => e.currentTarget.style.background = "#201f1f"}>
                View Reports
              </button>
              <button onClick={resetAll} style={{
                padding: 16, border: "none", borderRadius: 2,
                background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                color: "#68000a", fontSize: 10, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.12em",
                cursor: "pointer", fontFamily: "Inter",
                boxShadow: "0 4px 16px rgba(255,84,81,0.25)",
                transition: "all 0.2s",
              }}>
                Submit Another
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── Step components ────────────────────────────────────────────
function StepZone({ zones, search, onSearch, selected, onSelect }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-outlined"
            style={{ color: "#ffb3ad" }}>location_on</span>
          Select Incident Zone
        </h3>
        <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.6, margin: 0 }}>
          Specify the geospatial monitoring sector for this report.
        </p>
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <span className="material-symbols-outlined" style={{
          position: "absolute", left: 14, top: "50%",
          transform: "translateY(-50%)", fontSize: 18, color: "#e4beba", opacity: 0.5,
        }}>search</span>
        <input value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Search by Zone ID or District…"
          style={{
            width: "100%", background: "#1c1b1b", border: "none",
            borderRadius: 2, padding: "14px 14px 14px 44px",
            color: "#e5e2e1", fontFamily: "Inter", fontSize: 13,
            outline: "none", boxSizing: "border-box", transition: "box-shadow 0.2s",
          }}
          onFocus={e => e.target.style.boxShadow = "0 0 0 2px rgba(255,179,173,0.25)"}
          onBlur={e  => e.target.style.boxShadow = "none"}
        />
      </div>

      {/* Zone list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8,
        maxHeight: 220, overflowY: "auto" }}>
        {zones.length === 0 && (
          <p style={{ fontSize: 11, color: "#5b403e", textAlign: "center", padding: "20px 0" }}>
            No zones found
          </p>
        )}
        {zones.map(z => {
          const riskCol = z.risk_color === "red" ? "#ff5451"
            : z.risk_color === "orange" ? "#ffb95f"
            : "#4edea3";
          return (
            <div key={z.id} onClick={() => onSelect(z)} style={{
              background: selected === z.id ? "rgba(255,179,173,0.08)" : "#201f1f",
              border: selected === z.id
                ? "1px solid rgba(255,179,173,0.35)"
                : "1px solid rgba(91,64,62,0.15)",
              borderRadius: 2, padding: "14px 16px",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", cursor: "pointer",
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 40, height: 40, background: "#2a2a2a", borderRadius: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span className="material-symbols-outlined"
                    style={{ color: "#ffb3ad", fontSize: 20 }}>grid_view</span>
                </div>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700,
                    color: selected === z.id ? "#ffb3ad" : "#e5e2e1", margin: "0 0 4px" }}>
                    {z.name}
                  </h4>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{
                      fontSize: 9, color: "#e4beba", opacity: 0.6,
                      background: "#3a3939", padding: "2px 7px",
                      borderRadius: 2, textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>{z.district ?? "District"}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: riskCol,
                      background: `${riskCol}15`, padding: "2px 7px",
                      borderRadius: 2, display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%",
                        background: riskCol, animation: "crPulseDot 2s infinite" }} />
                      {z.risk_color?.toUpperCase() ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
              {selected === z.id && (
                <span className="material-symbols-outlined"
                  style={{ fontSize: 20, color: "#4edea3",
                    fontVariationSettings: "'FILL' 1",
                    animation: "crCheckBounce 0.3s ease both" }}>
                  check_circle
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepDetails({ form, set }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-outlined" style={{ color: "#ffb3ad" }}>edit_note</span>
          Crack Details
        </h3>
        <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.6, margin: 0 }}>
          Classify the crack and assign field severity.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Crack type */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
            textTransform: "uppercase", letterSpacing: "0.15em" }}>Crack Type</label>
          <div style={{ position: "relative" }}>
            <select value={form.crack_type}
              onChange={e => set("crack_type", e.target.value)}
              style={{
                width: "100%", background: "#1c1b1b", border: "none",
                borderRadius: 2, padding: "12px 32px 12px 12px",
                color: "#e5e2e1", fontFamily: "Inter", fontSize: 12,
                outline: "none", appearance: "none", cursor: "pointer",
              }}>
              {CRACK_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <span className="material-symbols-outlined" style={{
              position: "absolute", right: 8, top: "50%",
              transform: "translateY(-50%)", fontSize: 14,
              color: "#e4beba", pointerEvents: "none",
            }}>expand_more</span>
          </div>
        </div>

        {/* Severity */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
            textTransform: "uppercase", letterSpacing: "0.15em" }}>Severity Level</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { v: "low",      l: "Low",  col: "#4edea3" },
              { v: "moderate", l: "Mid",  col: "#ffb95f" },
              { v: "high",     l: "High", col: "#ff5451" },
            ].map(s => (
              <button key={s.v} onClick={() => set("severity", s.v)} style={{
                flex: 1, padding: "10px 4px", borderRadius: 2,
                background: form.severity === s.v ? `${s.col}18` : "#1c1b1b",
                border: form.severity === s.v ? `1px solid ${s.col}55` : "1px solid rgba(91,64,62,0.2)",
                color: form.severity === s.v ? s.col : "#e4beba",
                fontSize: 9, fontWeight: 800, fontFamily: "Inter",
                textTransform: "uppercase", letterSpacing: "0.08em",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: form.severity === s.v ? `0 0 12px ${s.col}33` : "none",
              }}>{s.l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Remarks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
          textTransform: "uppercase", letterSpacing: "0.15em" }}>Technical Remarks</label>
        <textarea value={form.remarks}
          onChange={e => set("remarks", e.target.value)}
          placeholder="Visible 5m long crack near support pillar 14-A. Soil erosion evident at base…"
          rows={4}
          style={{
            background: "#1c1b1b", border: "none", borderRadius: 2,
            padding: 14, color: "#e5e2e1", fontFamily: "Inter", fontSize: 12,
            resize: "vertical", outline: "none", lineHeight: 1.6,
            transition: "box-shadow 0.2s",
          }}
          onFocus={e => e.target.style.boxShadow = "0 0 0 2px rgba(255,179,173,0.2)"}
          onBlur={e  => e.target.style.boxShadow = "none"}
        />
      </div>
    </div>
  );
}

function StepMedia({ form, fileRef, onFile, onDrop }) {
  const [drag, setDrag] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-outlined" style={{ color: "#ffb3ad" }}>photo_camera</span>
          Visual Documentation
        </h3>
        <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.6, margin: 0 }}>
          Upload a high-resolution photo — this will be sent directly to the AI model.
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*"
        onChange={onFile} style={{ display: "none" }} />

      {!form.photoPreview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { setDrag(false); onDrop(e); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${drag ? "rgba(255,179,173,0.5)" : "rgba(91,64,62,0.3)"}`,
            borderRadius: 4, padding: "52px 32px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: drag ? "rgba(255,179,173,0.04)" : "rgba(32,31,31,0.4)",
            cursor: "pointer", transition: "all 0.2s",
          }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "#2a2a2a",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid rgba(255,179,173,0.15)",
            transition: "transform 0.2s",
            transform: drag ? "scale(1.1)" : "scale(1)",
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 28, color: "#ffb3ad" }}>upload_file</span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e5e2e1", margin: "0 0 4px" }}>
              Drag or tap to upload evidence
            </p>
            <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5,
              textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
              High resolution JPG / PNG only
            </p>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", borderRadius: 4, overflow: "hidden" }}>
          <img src={form.photoPreview} alt="preview"
            style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top,rgba(14,14,14,0.7),transparent)",
            display: "flex", alignItems: "flex-end", padding: 16,
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "#4edea3", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6 }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Photo attached
            </span>
            <button onClick={() => fileRef.current?.click()} style={{
              background: "rgba(42,42,42,0.9)", border: "1px solid rgba(255,179,173,0.2)",
              borderRadius: 2, padding: "6px 14px", color: "#ffb3ad",
              fontSize: 9, fontWeight: 800, fontFamily: "Inter",
              textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer",
            }}>Replace</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepReview({ form, user }) {
  const rows = [
    { label: "Zone",       val: form.zone_name || "—" },
    { label: "Crack Type", val: form.crack_type?.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()) || "—" },
    { label: "Severity",   val: form.severity?.toUpperCase() || "—" },
    { label: "Remarks",    val: form.remarks || "None" },
    { label: "GPS Coords", val: form.coords ? `${form.coords.lat.toFixed(4)}°N, ${form.coords.lng.toFixed(4)}°E` : "Unavailable" },
    { label: "Reported By",val: user?.full_name ?? user?.email ?? "—" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className="material-symbols-outlined" style={{ color: "#ffb3ad" }}>fact_check</span>
          Review & Submit
        </h3>
        <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.6, margin: 0 }}>
          Confirm details before sending to the AI pipeline.
        </p>
      </div>

      {/* Photo thumbnail */}
      {form.photoPreview && (
        <div style={{ borderRadius: 2, overflow: "hidden", height: 120 }}>
          <img src={form.photoPreview} alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      {/* Summary rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {rows.map(({ label, val }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            padding: "10px 14px", background: "#201f1f",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
            <span style={{ fontSize: 11, color: "#e5e2e1",
              maxWidth: "60%", textAlign: "right",
              wordBreak: "break-word" }}>{val}</span>
          </div>
        ))}
      </div>

      {/* AI notice */}
      <div style={{
        background: "rgba(78,222,163,0.06)",
        border: "1px solid rgba(78,222,163,0.15)",
        borderRadius: 2, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 18, color: "#4edea3",
            fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        <p style={{ fontSize: 11, color: "#4edea3", margin: 0, lineHeight: 1.5 }}>
          On submit, your photo will be sent to the AI scoring pipeline. Results appear within 30–60 seconds.
        </p>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// SHARED CSS
// ══════════════════════════════════════════════════════════════
const CSS = `
  @keyframes crFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crFadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes crSlideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes crShimmer   { from{opacity:0.3} to{opacity:0.6} }
  @keyframes crBarGrow   { from{width:0%} to{} }
  @keyframes crSpin      { to{transform:rotate(360deg)} }
  @keyframes crPulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(78,222,163,0.2)} 50%{box-shadow:0 0 0 12px rgba(78,222,163,0)} }
  @keyframes crCheckBounce{ from{transform:scale(0)} to{transform:scale(1)} }
  @keyframes crPopIn     { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
  @keyframes crPulseDot  { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes crGradientSlide{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#0e0e0e}
  ::-webkit-scrollbar-thumb{background:#3a3939;border-radius:4px}
`;
