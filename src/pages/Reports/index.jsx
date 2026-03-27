import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { fetchZones } from "../../api/zones";
import { useAuth } from "../../context/AuthContext";

// ── helpers ────────────────────────────────────────────────────
const SEV = {
  critical: { color: "#ffb4ab", bg: "rgba(255,180,171,0.1)", border: "rgba(255,180,171,0.25)", label: "Critical" },
  high:     { color: "#ffb3ad", bg: "rgba(255,179,173,0.1)", border: "rgba(255,179,173,0.25)", label: "High Risk" },
  medium:   { color: "#ffb95f", bg: "rgba(255,185,95,0.1)",  border: "rgba(255,185,95,0.25)",  label: "Moderate" },
  low:      { color: "#4edea3", bg: "rgba(78,222,163,0.1)",  border: "rgba(78,222,163,0.25)",  label: "Routine"  },
};

const STATUS = {
  pending:     { color: "#ffb95f", label: "Pending"    },
  reviewed:    { color: "#4edea3", label: "Reviewed"   },
  false_alarm: { color: "#e4beba", label: "False Alarm"},
  critical:    { color: "#ff5451", label: "Critical"   },
};

const DATE_RANGES = [
  { v: 7,   l: "Last 7 Days"  },
  { v: 30,  l: "Last 30 Days" },
  { v: 90,  l: "Last 90 Days" },
  { v: 0,   l: "All Time"     },
];

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

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "safety_officer";

  const [reports,   setReports]   = useState([]);
  const [zones,     setZones]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [mounted,   setMounted]   = useState(false);
  const [view,      setView]      = useState("grid");   // "grid" | "table"

  // filters
  const [fZone,     setFZone]     = useState("All");
  const [fSev,      setFSev]      = useState("All");
  const [fDays,     setFDays]     = useState(7);

  // open state for custom dropdowns
  const [openDrop,  setOpenDrop]  = useState(null);    // "zone"|"sev"|"date"|null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data }, zoneList] = await Promise.all([
        api.get("/api/reports"),
        fetchZones().catch(() => []),
      ]);
      setReports(data ?? []);
      setZones(zoneList ?? []);
    } catch { setReports([]); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  // close dropdowns on outside click
  useEffect(() => {
    const h = () => setOpenDrop(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // filter logic
  const now = Date.now();
  const visible = reports.filter(r => {
    if (fZone !== "All" && r.zone_name !== fZone) return false;
    if (fSev  !== "All" && r.severity  !== fSev.toLowerCase()) return false;
    if (fDays > 0) {
      const age = (now - new Date(r.created_at)) / 86400000;
      if (age > fDays) return false;
    }
    return true;
  });

  // KPI stats
  const total    = visible.length;
  const critical = visible.filter(r => r.severity === "critical" || r.severity === "high").length;
  const activeZones = [...new Set(visible.map(r => r.zone_name).filter(Boolean))];

  // featured (most recent high/critical)
  const featured = visible.find(r => r.severity === "critical" || r.severity === "high") ?? visible[0];
  const rest     = visible.filter(r => r !== featured);

  return (
    <div style={{
      padding: "32px 32px 100px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}
      onClick={() => setOpenDrop(null)}
    >

      {/* ── Filter bar ── */}
      <section style={{
        display: "flex", flexWrap: "wrap",
        alignItems: "flex-end", justifyContent: "space-between",
        gap: 16, marginBottom: 28,
        animation: "rpSlideDown 0.4s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>

          {/* Zone dropdown */}
          <FilterDrop
            label="Zone" value={fZone === "All" ? "All Zones" : fZone}
            open={openDrop === "zone"}
            onToggle={e => { e.stopPropagation(); setOpenDrop(p => p === "zone" ? null : "zone"); }}
          >
            {["All", ...zones.map(z => z.name)].map(z => (
              <DropItem key={z} active={fZone === z}
                onClick={() => { setFZone(z); setOpenDrop(null); }}>
                {z === "All" ? "All Zones" : z}
              </DropItem>
            ))}
          </FilterDrop>

          {/* Severity dropdown */}
          <FilterDrop
            label="Severity" value={fSev === "All" ? "All Severities" : fSev}
            open={openDrop === "sev"}
            onToggle={e => { e.stopPropagation(); setOpenDrop(p => p === "sev" ? null : "sev"); }}
          >
            {["All", "critical", "high", "medium", "low"].map(s => (
              <DropItem key={s} active={fSev === s}
                onClick={() => { setFSev(s); setOpenDrop(null); }}>
                {s === "All" ? "All Severities"
                  : s === "high" ? "Critical & High"
                  : s.charAt(0).toUpperCase() + s.slice(1)}
              </DropItem>
            ))}
          </FilterDrop>

          {/* Date range dropdown */}
          <FilterDrop
            label="Date Range"
            icon="calendar_today"
            value={DATE_RANGES.find(d => d.v === fDays)?.l ?? "Custom"}
            open={openDrop === "date"}
            onToggle={e => { e.stopPropagation(); setOpenDrop(p => p === "date" ? null : "date"); }}
          >
            {DATE_RANGES.map(d => (
              <DropItem key={d.v} active={fDays === d.v}
                onClick={() => { setFDays(d.v); setOpenDrop(null); }}>
                {d.l}
              </DropItem>
            ))}
          </FilterDrop>
        </div>

        {/* Grid / Table toggle */}
        <div style={{
          display: "flex", background: "#0e0e0e",
          padding: 4, borderRadius: 2,
          border: "1px solid rgba(91,64,62,0.12)",
        }}>
          {[
            { v: "grid",  icon: "grid_view",  l: "Grid"  },
            { v: "table", icon: "table_rows", l: "Table" },
          ].map(t => (
            <button key={t.v} onClick={() => setView(t.v)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 2, border: "none",
              background: view === t.v ? "#2a2a2a" : "transparent",
              color: view === t.v ? "#ffb3ad" : "#e4beba",
              fontSize: 10, fontWeight: 800, fontFamily: "Inter",
              textTransform: "uppercase", letterSpacing: "0.12em",
              cursor: "pointer", transition: "all 0.2s",
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 16 }}>{t.icon}</span>
              {t.l}
            </button>
          ))}
        </div>
      </section>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 24, marginBottom: 24 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              height: i === 1 ? 280 : 200,
              background: "#2a2a2a", borderRadius: 4,
              animation: `rpShimmer 1.4s ease ${i * 0.1}s infinite alternate`,
              gridColumn: i === 1 ? "span 2" : undefined,
            }} />
          ))}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && visible.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0",
          animation: "rpFadeUp 0.4s ease both" }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 52, color: "#3a3939", display: "block", marginBottom: 16 }}>
            description
          </span>
          <p style={{ fontSize: 11, color: "#5b403e",
            textTransform: "uppercase", letterSpacing: "0.12em" }}>
            No reports found for these filters
          </p>
        </div>
      )}

      {/* ══ GRID VIEW ══ */}
      {!loading && visible.length > 0 && view === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>

          {/* ── Featured card (spans 2 cols) ── */}
          {featured && (
            <FeaturedCard
              report={featured}
              isAdmin={isAdmin}
              onNavigate={() => navigate(`/reports/${featured.id}`)}
            />
          )}

          {/* ── Smaller cards ── */}
          {rest.map((r, i) => (
            <SmallCard key={r.id ?? i} report={r} idx={i}
              onNavigate={() => navigate(`/reports/${r.id}`)} />
          ))}

          {/* ── Add new card ── */}
          <AddCard onClick={() => navigate("/crack-reports")} />
        </div>
      )}

      {/* ══ TABLE VIEW ══ */}
      {!loading && visible.length > 0 && view === "table" && (
        <TableView reports={visible}
          onNavigate={(id) => navigate(`/reports/${id}`)} />
      )}

      {/* ── KPI stats ── */}
      {!loading && (
        <section style={{
          marginTop: 48,
          display: "grid", gridTemplateColumns: "1fr 1fr 2fr",
          gap: 20, animation: "rpFadeUp 0.4s ease 0.2s both",
        }}>
          <StatCard label="Total Reports" value={total} icon="trending_up"
            sub={`Last ${fDays > 0 ? fDays + " days" : "all time"}`} subColor="#4edea3" />
          <StatCard label="Unresolved High" value={critical} icon="schedule"
            subColor="#e4beba" sub={`Avg resolution: 14h`} valColor="#ffb4ab" />
          <ActiveZonesCard zones={activeZones} />
        </section>
      )}

      {/* ── FAB ── */}
      <FabButton onClick={() => navigate("/crack-reports")} />

      <style>{CSS}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// FEATURED CARD
// ══════════════════════════════════════════════════════════════
function FeaturedCard({ report: r, isAdmin, onNavigate }) {
  const [imgErr, setImgErr] = useState(false);
  const sev = SEV[r.severity] ?? SEV.low;
  const st  = STATUS[r.review_status] ?? STATUS.pending;

  return (
    <div style={{
      gridColumn: "span 2",
      background: "rgba(42,42,42,0.5)", backdropFilter: "blur(16px)",
      borderRadius: 4, padding: 24, position: "relative",
      overflow: "hidden", border: "1px solid rgba(91,64,62,0.08)",
      animation: "rpFadeUp 0.4s ease both",
      transition: "transform 0.25s, box-shadow 0.25s",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 20px 50px rgba(0,0,0,0.5)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
        background: sev.color,
        boxShadow: `0 0 12px ${sev.color}`,
      }} />

      <div style={{ display: "flex", gap: 20 }}>
        {/* Photo */}
        <div style={{
          width: "35%", flexShrink: 0, borderRadius: 2,
          overflow: "hidden", position: "relative",
          background: "#1c1b1b", minHeight: 180,
        }}>
          {r.photo_url && !imgErr ? (
            <img src={r.photo_url} alt="report" onError={() => setImgErr(true)}
              style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: "grayscale(0.5)",
                transition: "filter 0.5s, transform 0.5s",
              }}
              onMouseEnter={e => {
                e.target.style.filter = "grayscale(0)";
                e.target.style.transform = "scale(1.04)";
              }}
              onMouseLeave={e => {
                e.target.style.filter = "grayscale(0.5)";
                e.target.style.transform = "scale(1)";
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", minHeight: 180,
              display: "flex", alignItems: "center",
              justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 36, color: "#3a3939" }}>image</span>
              <span style={{ fontSize: 9, color: "#5b403e",
                textTransform: "uppercase", letterSpacing: "0.1em" }}>No photo</span>
            </div>
          )}
          {/* Sev badge */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: sev.bg, backdropFilter: "blur(8px)",
            border: `1px solid ${sev.border}`,
            borderRadius: 2, padding: "3px 8px",
          }}>
            <span style={{ fontSize: 9, fontWeight: 800,
              color: sev.color, textTransform: "uppercase",
              letterSpacing: "0.1em" }}>{sev.label}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e5e2e1",
                margin: "0 0 6px", lineHeight: 1.2 }}>
                {r.zone_name}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 12, color: "#e4beba", opacity: 0.6 }}>location_on</span>
                <span style={{ fontSize: 11, color: "#e4beba", opacity: 0.6 }}>
                  {r.coords ? `${r.coords.lat?.toFixed(3)}°N, ${r.coords.lng?.toFixed(3)}°E` : "Field observation"}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 800,
                color: st.color, textTransform: "uppercase",
                letterSpacing: "0.12em" }}>{st.label}</span>
              <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.5 }}>
                {timeAgo(r.created_at)}
              </span>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#e4beba", opacity: 0.7,
            lineHeight: 1.7, fontWeight: 300, flex: 1,
            margin: "0 0 16px",
            display: "-webkit-box", WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {r.remarks || "No remarks provided for this report."}
          </p>

          <div style={{
            paddingTop: 14, borderTop: "1px solid rgba(91,64,62,0.12)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <Reporter name={r.reported_by} role="Field Engineer" size="md" />
            {isAdmin && (
              <button onClick={onNavigate} style={{
                background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                border: "none", borderRadius: 2,
                padding: "9px 20px", color: "#68000a",
                fontSize: 9, fontWeight: 800, fontFamily: "Inter",
                textTransform: "uppercase", letterSpacing: "0.12em",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 4px 16px rgba(255,84,81,0.2)",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                View Full Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SMALL CARD
// ══════════════════════════════════════════════════════════════
function SmallCard({ report: r, idx, onNavigate }) {
  const sev = SEV[r.severity] ?? SEV.low;
  return (
    <div onClick={onNavigate} style={{
      background: "#201f1f", borderRadius: 4, padding: 24,
      border: "1px solid rgba(91,64,62,0.08)",
      cursor: "pointer",
      animation: `rpFadeUp 0.4s ease ${0.05 + idx * 0.05}s both`,
      transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = "#2a2a2a";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "#201f1f";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20 }}>
        {/* Sev pill */}
        <span style={{
          background: sev.bg, border: `1px solid ${sev.border}`,
          borderRadius: 2, padding: "4px 10px",
          fontSize: 9, fontWeight: 800, color: sev.color,
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>{sev.label}</span>
        <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.5 }}>
          {timeAgo(r.created_at)}
        </span>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1",
        marginBottom: 8 }}>{r.zone_name}</h3>

      <p style={{
        fontSize: 11, color: "#e4beba", opacity: 0.6,
        lineHeight: 1.6, fontWeight: 300, marginBottom: 20,
        display: "-webkit-box", WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {r.remarks || "No remarks provided."}
      </p>

      <Reporter name={r.reported_by} size="sm" />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADD CARD
// ══════════════════════════════════════════════════════════════
function AddCard({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#0e0e0e", borderRadius: 4, padding: 24,
        border: "2px dashed rgba(91,64,62,0.2)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        cursor: "pointer", minHeight: 200,
        transition: "all 0.2s",
        borderColor: hov ? "rgba(255,179,173,0.3)" : "rgba(91,64,62,0.2)",
        ...(hov ? { background: "#1c1b1b" } : { background: "#0e0e0e" }),
        animation: "rpFadeUp 0.4s ease 0.3s both",
      }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        border: `1px solid ${hov ? "rgba(255,179,173,0.5)" : "rgba(255,179,173,0.25)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 16, transition: "transform 0.2s, border-color 0.2s",
        transform: hov ? "scale(1.1)" : "scale(1)",
      }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 22, color: "#ffb3ad" }}>add</span>
      </div>
      <h3 style={{ fontSize: 10, fontWeight: 800, color: "#e5e2e1",
        textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>
        Submit Field Report
      </h3>
      <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5,
        fontWeight: 300, margin: 0 }}>
        Upload photo and telemetry findings
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TABLE VIEW
// ══════════════════════════════════════════════════════════════
function TableView({ reports, onNavigate }) {
  const COLS = ["Zone", "Severity", "Status", "Reporter", "Date", "Action"];
  return (
    <div style={{
      background: "#201f1f", borderRadius: 4,
      border: "1px solid rgba(91,64,62,0.1)",
      overflow: "hidden", animation: "rpFadeUp 0.3s ease both",
    }}>
      {/* Header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr 80px",
        padding: "12px 20px",
        borderBottom: "1px solid rgba(91,64,62,0.12)",
        background: "#1c1b1b",
      }}>
        {COLS.map(c => (
          <span key={c} style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
            textTransform: "uppercase", letterSpacing: "0.14em" }}>{c}</span>
        ))}
      </div>

      {/* Rows */}
      {reports.map((r, i) => {
        const sev = SEV[r.severity] ?? SEV.low;
        const st  = STATUS[r.review_status] ?? STATUS.pending;
        return (
          <div key={r.id ?? i} style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1.5fr 1fr 80px",
            padding: "14px 20px", alignItems: "center",
            borderBottom: "1px solid rgba(91,64,62,0.06)",
            animation: `rpFadeUp 0.3s ease ${i * 0.03}s both`,
            transition: "background 0.15s",
            cursor: "pointer",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1" }}>
              {r.zone_name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, color: sev.color,
              background: sev.bg, border: `1px solid ${sev.border}`,
              padding: "3px 8px", borderRadius: 2,
              textTransform: "uppercase", letterSpacing: "0.08em",
              display: "inline-block",
            }}>{sev.label}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: st.color,
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>{st.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%", background: "#3a3939",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 800, color: "#e4beba",
              }}>{initials(r.reported_by)}</div>
              <span style={{ fontSize: 11, color: "#e5e2e1" }}>{r.reported_by}</span>
            </div>
            <span style={{ fontSize: 11, color: "#e4beba", opacity: 0.6 }}>
              {timeAgo(r.created_at)}
            </span>
            <button onClick={() => onNavigate(r.id)} style={{
              background: "transparent",
              border: "1px solid rgba(255,179,173,0.2)",
              borderRadius: 2, padding: "5px 10px",
              color: "#ffb3ad", fontSize: 9, fontWeight: 800,
              fontFamily: "Inter", textTransform: "uppercase",
              letterSpacing: "0.08em", cursor: "pointer",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,179,173,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,179,173,0.4)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,179,173,0.2)";
              }}>
              View
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// STAT CARDS
// ══════════════════════════════════════════════════════════════
function StatCard({ label, value, icon, sub, subColor, valColor = "#e5e2e1" }) {
  return (
    <div style={{
      background: "#1c1b1b", borderRadius: 4, padding: "24px",
      transition: "transform 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.6,
        textTransform: "uppercase", letterSpacing: "0.14em",
        fontWeight: 600, display: "block", marginBottom: 10 }}>
        {label}
      </span>
      <span style={{ fontSize: 44, fontWeight: 800, color: valColor, lineHeight: 1, display: "block" }}>
        {value}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 14, color: subColor }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: subColor }}>
          {sub}
        </span>
      </div>
    </div>
  );
}

function ActiveZonesCard({ zones }) {
  return (
    <div style={{ background: "#1c1b1b", borderRadius: 4, padding: "24px" }}>
      <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.6,
        textTransform: "uppercase", letterSpacing: "0.14em",
        fontWeight: 600, display: "block", marginBottom: 16 }}>
        Reporting Active Zones
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {zones.length === 0
          ? <span style={{ fontSize: 11, color: "#5b403e" }}>No active zones</span>
          : zones.map(z => (
            <span key={z} style={{
              background: "#3a3939", borderRadius: 2,
              padding: "5px 10px", fontSize: 9, fontWeight: 800,
              color: "#e5e2e1", textTransform: "uppercase",
              letterSpacing: "0.1em", transition: "background 0.2s, color 0.2s",
              cursor: "default",
              animation: "rpFadeUp 0.3s ease both",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,179,173,0.12)";
                e.currentTarget.style.color = "#ffb3ad";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#3a3939";
                e.currentTarget.style.color = "#e5e2e1";
              }}>
              {z}
            </span>
          ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SHARED SMALL COMPONENTS
// ══════════════════════════════════════════════════════════════
function Reporter({ name = "—", role, size = "sm" }) {
  const big = size === "md";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: big ? 10 : 8 }}>
      <div style={{
        width: big ? 32 : 24, height: big ? 32 : 24,
        borderRadius: "50%", background: "#3a3939",
        border: "1px solid rgba(255,179,173,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: big ? 9 : 7, fontWeight: 800, color: "#ffb3ad",
      }}>{initials(name)}</div>
      <div>
        <span style={{ display: "block", fontSize: big ? 13 : 11,
          fontWeight: 600, color: "#e5e2e1" }}>{name}</span>
        {role && (
          <span style={{ display: "block", fontSize: 9, color: "#e4beba",
            opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {role}
          </span>
        )}
      </div>
    </div>
  );
}

function FilterDrop({ label, value, icon, open, onToggle, children }) {
  return (
    <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <span style={{ display: "block", fontSize: 10, color: "#e4beba",
        opacity: 0.6, fontWeight: 300, letterSpacing: "0.1em",
        marginBottom: 5 }}>{label}</span>
      <div onClick={onToggle} style={{
        background: "#2a2a2a", borderRadius: 2,
        border: `1px solid ${open ? "rgba(255,179,173,0.25)" : "rgba(91,64,62,0.15)"}`,
        padding: "9px 14px", display: "flex", alignItems: "center",
        gap: 10, cursor: "pointer", minWidth: 150, transition: "all 0.2s",
      }}>
        {icon && (
          <span className="material-symbols-outlined"
            style={{ fontSize: 14, color: "#e4beba" }}>{icon}</span>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e2e1", flex: 1 }}>
          {value}
        </span>
        <span className="material-symbols-outlined" style={{
          fontSize: 14, color: "#e4beba",
          transform: open ? "rotate(180deg)" : "rotate(0)",
          transition: "transform 0.2s",
        }}>expand_more</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: "#2a2a2a", borderRadius: 2, zIndex: 50,
          border: "1px solid rgba(91,64,62,0.2)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          minWidth: 160, overflow: "hidden",
          animation: "rpDropIn 0.15s ease both",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function DropItem({ children, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "10px 16px", fontSize: 12,
        color: active ? "#ffb3ad" : hov ? "#e5e2e1" : "#e4beba",
        background: active ? "rgba(255,179,173,0.08)" : hov ? "#3a3939" : "transparent",
        cursor: "pointer", transition: "all 0.15s",
        fontWeight: active ? 700 : 400,
      }}>
      {children}
    </div>
  );
}

function FabButton({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "fixed", bottom: 32, right: 32,
        width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg,#ff5451,#ffb3ad)",
        border: "none", cursor: "pointer", zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: hov
          ? "0 8px 32px rgba(255,84,81,0.45)"
          : "0 4px 20px rgba(255,84,81,0.25)",
        transform: hov ? "scale(1.08)" : "scale(1)",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        animation: "rpFabIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both",
      }}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 22, color: "#68000a",
          fontVariationSettings: "'FILL' 1" }}>
        add_a_photo
      </span>
    </button>
  );
}

// ══════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════
const CSS = `
  @keyframes rpFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rpSlideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rpShimmer   { from{opacity:0.25} to{opacity:0.55} }
  @keyframes rpDropIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes rpFabIn     { from{opacity:0;transform:scale(0)} to{opacity:1;transform:scale(1)} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#0e0e0e}
  ::-webkit-scrollbar-thumb{background:#3a3939;border-radius:4px}
`;
