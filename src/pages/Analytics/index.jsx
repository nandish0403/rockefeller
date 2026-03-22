import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { fetchZones } from "../../api/zones";

// ── helpers ────────────────────────────────────────────────────
const RISK_CFG = {
  red:    { color: "#ff5451", label: "Critical", bg: "rgba(255,84,81,0.1)"  },
  orange: { color: "#ffb95f", label: "High",     bg: "rgba(255,185,95,0.1)" },
  yellow: { color: "#ffeb3b", label: "Moderate", bg: "rgba(255,235,59,0.08)"},
  green:  { color: "#4edea3", label: "Low",      bg: "rgba(78,222,163,0.1)" },
};

function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [mounted,  setMounted]  = useState(false);
  const [zones,    setZones]    = useState([]);
  const [alerts,   setAlerts]   = useState([]);
  const [blasts,   setBlasts]   = useState([]);
  const [weather,  setWeather]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fRisk,    setFRisk]    = useState("All");
  const [fMine,    setFMine]    = useState("All");
  const [sortBy,   setSortBy]   = useState("risk"); // "risk"|"name"|"rainfall"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [zoneList, { data: alertData }, { data: blastData }, { data: wxData }] =
        await Promise.all([
          fetchZones().catch(() => []),
          api.get("/api/alerts").catch(() => ({ data: [] })),
          api.get("/api/blast-events").catch(() => ({ data: [] })),
          api.get("/api/weather").catch(() => ({ data: [] })),
        ]);
      setZones(zoneList  ?? []);
      setAlerts(alertData  ?? []);
      setBlasts(blastData  ?? []);
      setWeather(wxData    ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  // KPIs
  const totalZones  = zones.length;
  const critZones   = zones.filter(z => z.risk_level === "red").length;
  const highZones   = zones.filter(z => z.risk_level === "orange").length;
  const avgRisk     = zones.length
    ? Math.round(zones.reduce((a, z) => a + (z.risk_score ?? 0), 0) / zones.length * 100)
    : 0;

  // filter + sort
  const mines = ["All", ...new Set(zones.map(z => z.mine_name).filter(Boolean))];
  const filtered = zones
    .filter(z => fRisk === "All" || z.risk_level === fRisk)
    .filter(z => fMine === "All" || z.mine_name === fMine)
    .sort((a, b) => {
      if (sortBy === "risk")     return (b.risk_score ?? 0) - (a.risk_score ?? 0);
      if (sortBy === "name")     return a.name.localeCompare(b.name);
      if (sortBy === "rainfall") return (b.recent_rainfall ?? 0) - (a.recent_rainfall ?? 0);
      return 0;
    });

  // risk distribution for bar chart
  const distrib = ["red","orange","yellow","green"].map(k => ({
    key: k, ...RISK_CFG[k],
    count: zones.filter(z => z.risk_level === k).length,
    pct: totalZones ? Math.round(zones.filter(z => z.risk_level === k).length / totalZones * 100) : 0,
  }));

  return (
    <div style={{
      padding: "32px 32px 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}>

      {/* ── KPI Row ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 20, marginBottom: 28 }}>
        {[
          { label: "Total Zones",     val: totalZones, icon: "layers",          color: "#ffb3ad", accent: null       },
          { label: "Critical",        val: critZones,  icon: "crisis_alert",    color: "#ff5451", accent: "#ff5451"  },
          { label: "High Risk",       val: highZones,  icon: "warning",         color: "#ffb95f", accent: null       },
          { label: "Avg Risk Score",  val: `${avgRisk}%`, icon: "analytics",   color: "#4edea3", accent: null       },
        ].map(({ label, val, icon, color, accent }, i) => (
          <div key={label} style={{
            background: "#2a2a2a", borderRadius: 4, padding: "20px 24px",
            border: accent ? `1px solid ${accent}33` : "1px solid rgba(91,64,62,0.1)",
            borderLeft: accent ? `4px solid ${accent}` : undefined,
            position: "relative", overflow: "hidden",
            animation: `anFadeUp 0.4s ease ${i * 0.07}s both`,
            transition: "transform 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
          >
            <span style={{ fontSize: 10, color: "#e4beba", opacity: 0.6,
              textTransform: "uppercase", letterSpacing: "0.15em",
              fontWeight: 700, display: "block", marginBottom: 8 }}>{label}</span>
            <span style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1 }}>
              {loading ? "—" : val}
            </span>
            <span className="material-symbols-outlined" style={{
              position: "absolute", top: 16, right: 16, fontSize: 32,
              color, opacity: 0.12, fontVariationSettings: "'FILL' 1",
            }}>{icon}</span>
          </div>
        ))}
      </section>

      {/* ── Main bento grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, marginBottom: 24 }}>

        {/* ── Zone filter + grid ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Controls */}
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end",
            animation: "anSlideDown 0.4s ease 0.1s both",
          }}>
            {/* Risk filter pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                textTransform: "uppercase", letterSpacing: "0.14em" }}>Risk Level</span>
              <div style={{ display: "flex", gap: 4 }}>
                {["All","red","orange","yellow","green"].map(r => {
                  const cfg = RISK_CFG[r];
                  const active = fRisk === r;
                  return (
                    <button key={r} onClick={() => setFRisk(r)} style={{
                      padding: "6px 12px", borderRadius: 2,
                      background: active ? (cfg?.bg ?? "rgba(255,179,173,0.1)") : "transparent",
                      border: `1px solid ${active ? (cfg?.color ?? "rgba(255,179,173,0.3)") : "rgba(91,64,62,0.2)"}`,
                      color: active ? (cfg?.color ?? "#ffb3ad") : "#e4beba",
                      fontSize: 9, fontWeight: 800, fontFamily: "Inter",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      cursor: "pointer", transition: "all 0.2s",
                    }}>
                      {r === "All" ? "All" : cfg?.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mine filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                textTransform: "uppercase", letterSpacing: "0.14em" }}>Mine</span>
              <div style={{ position: "relative" }}>
                <select value={fMine} onChange={e => setFMine(e.target.value)} style={{
                  background: "#2a2a2a", border: "1px solid rgba(91,64,62,0.2)",
                  color: "#e5e2e1", fontSize: 11, padding: "7px 28px 7px 10px",
                  fontFamily: "Inter", outline: "none", borderRadius: 2,
                  appearance: "none", cursor: "pointer", minWidth: 140,
                }}>
                  {mines.map(m => <option key={m} value={m}>{m === "All" ? "All Mines" : m}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{
                  position: "absolute", right: 6, top: "50%",
                  transform: "translateY(-50%)", fontSize: 14,
                  color: "#e4beba", pointerEvents: "none",
                }}>expand_more</span>
              </div>
            </div>

            {/* Sort */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                textTransform: "uppercase", letterSpacing: "0.14em" }}>Sort By</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["risk","Risk Score"],["name","Name"],["rainfall","Rainfall"]].map(([v,l]) => (
                  <button key={v} onClick={() => setSortBy(v)} style={{
                    padding: "6px 12px", borderRadius: 2,
                    background: sortBy === v ? "rgba(255,179,173,0.08)" : "transparent",
                    border: `1px solid ${sortBy === v ? "rgba(255,179,173,0.3)" : "rgba(91,64,62,0.15)"}`,
                    color: sortBy === v ? "#ffb3ad" : "#e4beba",
                    fontSize: 9, fontWeight: 800, fontFamily: "Inter",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Zone grid */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ height: 160, background: "#2a2a2a", borderRadius: 4,
                  animation: `anShimmer 1.4s ease ${i*0.1}s infinite alternate` }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", animation: "anFadeUp 0.4s ease both" }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 48, color: "#3a3939", display: "block", marginBottom: 12 }}>layers</span>
              <p style={{ fontSize: 11, color: "#5b403e",
                textTransform: "uppercase", letterSpacing: "0.12em" }}>No zones match filters</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {filtered.map((z, i) => (
                <ZoneCard key={z.id ?? i} zone={z} idx={i}
                  onClick={() => navigate(`/zones/${z.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Risk Distribution */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4,
            border: "1px solid rgba(91,64,62,0.1)", padding: 24,
            animation: "anFadeUp 0.4s ease 0.1s both",
          }}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>
              Risk Distribution
            </h3>
            {distrib.map((d, i) => (
              <div key={d.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: d.color,
                    textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: d.color }}>
                    {loading ? "—" : d.count}
                  </span>
                </div>
                <div style={{ height: 4, background: "#1c1b1b", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: loading ? "0%" : `${d.pct}%`,
                    background: d.color,
                    borderRadius: 99,
                    boxShadow: `0 0 8px ${d.color}66`,
                    transition: "width 0.8s ease",
                    animation: `anBarGrow 0.8s ease ${i * 0.1}s both`,
                  }} />
                </div>
                <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.4 }}>
                  {loading ? "" : `${d.pct}% of zones`}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Blasts */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4,
            border: "1px solid rgba(91,64,62,0.1)", padding: 24,
            animation: "anFadeUp 0.4s ease 0.15s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
                textTransform: "uppercase", letterSpacing: "0.15em" }}>
                Recent Blasts
              </h3>
              <span className="material-symbols-outlined"
                style={{ fontSize: 16, color: "#ffb95f" }}>bolt</span>
            </div>
            {blasts.length === 0 ? (
              <p style={{ fontSize: 11, color: "#5b403e", textAlign: "center", padding: "12px 0" }}>
                No blast events
              </p>
            ) : blasts.slice(0, 4).map((b, i) => (
              <div key={b.id ?? i} style={{
                display: "flex", alignItems: "center", gap: 12,
                paddingLeft: 12, borderLeft: "2px solid rgba(255,185,95,0.3)",
                marginBottom: 12, position: "relative",
                animation: `anFadeUp 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{
                  position: "absolute", left: -5, top: 4,
                  width: 8, height: 8, borderRadius: "50%",
                  background: "#ffb95f",
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1",
                    margin: "0 0 2px" }}>{b.zone_name}</p>
                  <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.6, margin: 0 }}>
                    {b.intensity ? `Intensity ${b.intensity}` : "—"}
                    {b.depth_meters ? ` • ${b.depth_meters}m depth` : ""}
                  </p>
                </div>
                <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.4 }}>
                  {timeAgo(b.blast_date ?? b.created_at)}
                </span>
              </div>
            ))}
          </div>

          {/* Active Alerts */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4,
            border: "1px solid rgba(91,64,62,0.1)", padding: 24,
            animation: "anFadeUp 0.4s ease 0.2s both",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
                textTransform: "uppercase", letterSpacing: "0.15em" }}>Active Alerts</h3>
              <span style={{
                fontSize: 9, fontWeight: 800, color: "#ff5451",
                background: "rgba(255,84,81,0.1)", borderRadius: 2,
                padding: "3px 8px", animation: "anPulseDot 2s infinite",
              }}>
                {alerts.filter(a => a.status === "active").length} LIVE
              </span>
            </div>
            {alerts.filter(a => a.status === "active").slice(0, 3).map((a, i) => (
              <div key={a.id ?? i} style={{
                background: "#1c1b1b", borderRadius: 2, padding: "10px 12px",
                borderLeft: "3px solid #ff5451", marginBottom: 8,
                animation: `anFadeUp 0.3s ease ${i * 0.05}s both`,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1",
                  margin: "0 0 3px" }}>{a.zone_name}</p>
                <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.6, margin: 0,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {a.trigger_reason ?? "Alert triggered"}
                </p>
              </div>
            ))}
            {alerts.filter(a => a.status === "active").length === 0 && (
              <p style={{ fontSize: 11, color: "#5b403e",
                textAlign: "center", padding: "12px 0" }}>All clear</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Rainfall bar chart across districts ── */}
      <div style={{
        background: "#2a2a2a", borderRadius: 4,
        border: "1px solid rgba(91,64,62,0.1)", padding: 28,
        animation: "anFadeUp 0.4s ease 0.2s both",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
              opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.15em",
              display: "block", marginBottom: 4 }}>Rainfall Monitoring</span>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#e5e2e1", margin: 0 }}>
              Precipitation by Zone
            </p>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {weather.slice(0, 1).map(w => (
              <>
                <div key="rf" style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                    opacity: 0.5, textTransform: "uppercase",
                    letterSpacing: "0.12em", display: "block" }}>Latest Rainfall</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#e5e2e1" }}>
                    {w.rainfall_mm?.toFixed(1) ?? "—"}mm/h
                  </span>
                </div>
                <div style={{ width: 1, background: "rgba(91,64,62,0.2)" }} />
                <div key="hm" style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                    opacity: 0.5, textTransform: "uppercase",
                    letterSpacing: "0.12em", display: "block" }}>Humidity</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: "#e5e2e1" }}>
                    {w.humidity_percent ?? "—"}%
                  </span>
                </div>
              </>
            ))}
          </div>
        </div>

        {/* Zone rainfall bars */}
        <div style={{ display: "flex", alignItems: "flex-end",
          gap: 8, height: 120, position: "relative" }}>
          {/* Y-axis guide lines */}
          {[25, 50, 75, 100].map(p => (
            <div key={p} style={{
              position: "absolute", left: 0, right: 0,
              bottom: `${p}%`, height: 1,
              background: "rgba(91,64,62,0.08)", pointerEvents: "none",
            }} />
          ))}
          {(loading ? Array(8).fill(null) : zones).map((z, i) => {
            const rf   = z?.recent_rainfall ?? 0;
            const max  = Math.max(...zones.map(z => z.recent_rainfall ?? 0), 1);
            const pct  = Math.round((rf / max) * 100);
            const risk = z?.risk_level ?? "green";
            const col  = RISK_CFG[risk]?.color ?? "#4edea3";
            const isCrit = risk === "red" || risk === "orange";
            return (
              <div key={i} style={{ flex: 1, display: "flex",
                flexDirection: "column", alignItems: "center", gap: 6 }}>
                {/* Tooltip */}
                <div style={{
                  fontSize: 9, fontWeight: 800, color: col,
                  opacity: pct > 50 ? 1 : 0.5,
                  marginBottom: 2,
                }}>
                  {z?.recent_rainfall != null ? `${z.recent_rainfall}mm` : ""}
                </div>
                <div style={{
                  width: "100%", maxWidth: 28,
                  height: loading ? 60 : `${Math.max(pct, 4)}%`,
                  background: loading
                    ? "#3a3939"
                    : isCrit
                      ? `linear-gradient(to top, ${col}, ${col}99)`
                      : `rgba(78,222,163,0.35)`,
                  borderRadius: "2px 2px 0 0",
                  transition: "height 0.8s ease",
                  animation: loading
                    ? `anShimmer 1.4s ease ${i * 0.07}s infinite alternate`
                    : `anBarGrow 0.8s ease ${i * 0.06}s both`,
                  boxShadow: isCrit ? `0 0 8px ${col}55` : "none",
                  cursor: z ? "pointer" : "default",
                  position: "relative",
                }}
                  onClick={() => z && navigate(`/zones/${z.id}`)}
                  onMouseEnter={e => { if (z) e.currentTarget.style.opacity = "0.8"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                >
                  {isCrit && !loading && (
                    <div style={{
                      position: "absolute", top: -2, left: "50%",
                      transform: "translateX(-50%)",
                      width: 4, height: 4, borderRadius: "50%",
                      background: col,
                      animation: "anPulseDot 2s infinite",
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: 7, color: "#e4beba", opacity: 0.4,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  textAlign: "center", maxWidth: 32,
                  display: "block", lineHeight: 1.3,
                }}>
                  {z?.name?.slice(0, 4) ?? ""}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.35,
          textTransform: "uppercase", letterSpacing: "0.14em",
          marginTop: 12, textAlign: "center" }}>
          Click any bar to view zone details
        </p>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

// ── Zone Card ──────────────────────────────────────────────────
function ZoneCard({ zone: z, idx, onClick }) {
  const cfg    = RISK_CFG[z.risk_level] ?? RISK_CFG.green;
  const score  = Math.round((z.risk_score ?? 0) * 100);
  const [hov, setHov] = useState(false);

  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "#2a2a2a" : "#201f1f",
        borderRadius: 4, padding: 20,
        border: `1px solid ${hov ? cfg.color + "33" : "rgba(91,64,62,0.1)"}`,
        cursor: "pointer",
        animation: `anFadeUp 0.4s ease ${0.05 + idx * 0.04}s both`,
        transition: "all 0.25s",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 32px rgba(0,0,0,0.4)` : "none",
        position: "relative", overflow: "hidden",
      }}>
      {/* Left accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 3, height: "100%",
        background: cfg.color,
        opacity: hov ? 1 : 0.4, transition: "opacity 0.2s",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#e5e2e1",
            margin: "0 0 4px" }}>{z.name}</h3>
          <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.6, margin: 0 }}>
            {z.mine_name} · {z.district}
          </p>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, color: cfg.color,
          background: cfg.bg, border: `1px solid ${cfg.color}33`,
          borderRadius: 2, padding: "3px 8px",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>{cfg.label}</span>
      </div>

      {/* Risk bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.5,
            textTransform: "uppercase", letterSpacing: "0.1em" }}>Risk Score</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color }}>{score}%</span>
        </div>
        <div style={{ height: 3, background: "#1c1b1b", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${score}%`, background: cfg.color,
            borderRadius: 99, boxShadow: `0 0 6px ${cfg.color}66`,
            animation: "anBarGrow 0.8s ease both",
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Meta chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {z.soil_type && (
          <Chip icon="terrain" label={z.soil_type} />
        )}
        {z.slope_angle != null && (
          <Chip icon="show_chart" label={`${z.slope_angle}° slope`} />
        )}
        {z.blast_count_7d > 0 && (
          <Chip icon="bolt" label={`${z.blast_count_7d} blasts`} color="#ffb95f" />
        )}
        {z.recent_rainfall != null && (
          <Chip icon="water_drop" label={`${z.recent_rainfall}mm`} />
        )}
      </div>

      {/* Hover CTA */}
      <div style={{
        position: "absolute", bottom: 0, right: 0,
        padding: "8px 14px",
        opacity: hov ? 1 : 0, transition: "opacity 0.2s",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color,
          textTransform: "uppercase", letterSpacing: "0.1em" }}>View Details</span>
        <span className="material-symbols-outlined"
          style={{ fontSize: 13, color: cfg.color }}>arrow_forward</span>
      </div>
    </div>
  );
}

function Chip({ icon, label, color = "#e4beba" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#1c1b1b", borderRadius: 2, padding: "3px 8px",
    }}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 10, color }}>{icon}</span>
      <span style={{ fontSize: 9, color, opacity: 0.8 }}>{label}</span>
    </span>
  );
}

const CSS = `
  @keyframes anFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes anSlideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes anShimmer   { from{opacity:0.25} to{opacity:0.55} }
  @keyframes anBarGrow   { from{width:0%} to{} }
  @keyframes anPulseDot  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#0e0e0e}
  ::-webkit-scrollbar-thumb{background:#3a3939;border-radius:4px}
`;
