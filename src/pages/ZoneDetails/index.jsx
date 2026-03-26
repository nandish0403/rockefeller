import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { fetchDistrictForecast, fetchZoneForecastFlags } from "../../api/rainfall";

const RISK_CFG = {
  red:    { color: "#ff5451", label: "Critical Risk",  bg: "rgba(255,84,81,0.1)"   },
  orange: { color: "#ffb95f", label: "High Risk",      bg: "rgba(255,185,95,0.1)"  },
  yellow: { color: "#ffeb3b", label: "Moderate Risk",  bg: "rgba(255,235,59,0.08)" },
  green:  { color: "#4edea3", label: "Low Risk",       bg: "rgba(78,222,163,0.1)"  },
};

function timeAgo(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TABS = ["Overview", "Alerts", "Blast Events", "Crack Reports", "Weather"];

export default function ZoneDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [zone,       setZone]      = useState(null);
  const [alerts,     setAlerts]    = useState([]);
  const [blasts,     setBlasts]    = useState([]);
  const [cracks,     setCracks]    = useState([]);
  const [weather,    setWeather]   = useState([]);
  const [forecast7d, setForecast7d] = useState([]);
  const [forecastFlag, setForecastFlag] = useState(null);
  const [loading,    setLoading]   = useState(true);
  const [mounted,    setMounted]   = useState(false);
  const [tab,        setTab]       = useState(0);
  const [actioning,  setActioning] = useState(null);
  const [mlOpen,     setMlOpen]    = useState(false);
  const [mlLoading,  setMlLoading] = useState(false);
  const [mlError,    setMlError]   = useState("");
  const [mlData,     setMlData]    = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [{ data: z }, { data: al }, { data: bl }, { data: cr }, { data: wx }] =
        await Promise.all([
          api.get(`/api/zones/${id}`),
          api.get(`/api/alerts?zone_id=${id}`).catch(() => ({ data: [] })),
          api.get(`/api/blast-events?zone_id=${id}`).catch(() => ({ data: [] })),
          api.get(`/api/crack-reports?zone_id=${id}`).catch(() => ({ data: [] })),
          api.get(`/api/weather?district=${encodeURIComponent("all")}`).catch(() => ({ data: [] })),
        ]);
      setZone(z);
      setAlerts(al ?? []);
      setBlasts(bl ?? []);
      setCracks(cr ?? []);
      setWeather(wx ?? []);

      if (z?.district) {
        try {
          const [districtForecast, flagPayload] = await Promise.all([
            fetchDistrictForecast(z.district, 7),
            fetchZoneForecastFlags(7),
          ]);
          setForecast7d(districtForecast?.forecast || []);
          const match = (flagPayload?.zones || []).find((row) => row.zone_id === z.id);
          setForecastFlag(match || null);
        } catch {
          setForecast7d([]);
          setForecastFlag(null);
        }
      } else {
        setForecast7d([]);
        setForecastFlag(null);
      }
    } catch { setZone(null); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  const ackAlert = async (alertId) => {
    setActioning(alertId);
    try { await api.patch(`/api/alerts/${alertId}`, { status: "acknowledged" }); await load(); }
    finally { setActioning(null); }
  };

  const resolveAlert = async (alertId) => {
    setActioning(alertId + "res");
    try { await api.patch(`/api/alerts/${alertId}`, { status: "resolved" }); await load(); }
    finally { setActioning(null); }
  };

  const getTopFactors = (features = {}) => {
    const impactCandidates = [
      {
        key: "rainfall_mm_24h",
        label: "Rainfall (24h)",
        value: Number(features.rainfall_mm_24h || 0),
        impact: Number(features.rainfall_mm_24h || 0) * 1.2,
      },
      {
        key: "rainfall_mm_7d",
        label: "Rainfall (7d)",
        value: Number(features.rainfall_mm_7d || 0),
        impact: Number(features.rainfall_mm_7d || 0) * 0.45,
      },
      {
        key: "crack_count_7d",
        label: "Crack Count (7d)",
        value: Number(features.crack_count_7d || 0),
        impact: Number(features.crack_count_7d || 0) * 7.5,
      },
      {
        key: "avg_crack_score",
        label: "Average Crack Score",
        value: Number(features.avg_crack_score || 0),
        impact: Number(features.avg_crack_score || 0) * 100,
      },
      {
        key: "blast_count_7d",
        label: "Blast Count (7d)",
        value: Number(features.blast_count_7d || 0),
        impact: Number(features.blast_count_7d || 0) * 6.8,
      },
      {
        key: "avg_blast_intensity",
        label: "Avg Blast Intensity",
        value: Number(features.avg_blast_intensity || 0),
        impact: Number(features.avg_blast_intensity || 0) * 20,
      },
      {
        key: "critical_crack_flag",
        label: "Critical Crack Flag",
        value: Number(features.critical_crack_flag || 0),
        impact: Number(features.critical_crack_flag || 0) * 80,
      },
      {
        key: "days_since_inspection",
        label: "Days Since Inspection",
        value: Number(features.days_since_inspection || 0),
        impact: Number(features.days_since_inspection || 0) * 0.9,
      },
    ];

    return impactCandidates
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 4);
  };

  const runRiskPrediction = async () => {
    setMlLoading(true);
    setMlError("");
    setMlOpen(true);
    try {
      const { data } = await api.get(`/api/zones/${id}/forecast`);
      setMlData(data ?? null);
    } catch {
      setMlError("Unable to run prediction right now. Please try again.");
      setMlData(null);
    } finally {
      setMlLoading(false);
    }
  };

  if (loading) return <ZDSkeleton />;
  if (!zone)   return (
    <div style={{ padding: 48, textAlign: "center", fontFamily: "Inter" }}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 48, color: "#3a3939", display: "block", marginBottom: 12 }}>
        layers
      </span>
      <p style={{ color: "#5b403e", fontSize: 12,
        textTransform: "uppercase", letterSpacing: "0.12em" }}>Zone not found</p>
      <button onClick={() => navigate("/analytics")} style={{
        marginTop: 16, padding: "10px 24px", borderRadius: 2,
        background: "rgba(255,179,173,0.1)", border: "1px solid rgba(255,179,173,0.2)",
        color: "#ffb3ad", fontSize: 11, fontWeight: 700, cursor: "pointer",
        fontFamily: "Inter", textTransform: "uppercase", letterSpacing: "0.1em",
      }}>← Back to Analytics</button>
    </div>
  );

  const cfg   = RISK_CFG[zone.risk_level] ?? RISK_CFG.green;
  const score = Math.round((zone.risk_score ?? 0) * 100);
  const isCrit = zone.risk_level === "red" || zone.risk_level === "orange";

  return (
    <div style={{
      padding: "32px 32px 80px",
      fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.45s ease",
    }}>

      {/* ── Back breadcrumb ── */}
      <button onClick={() => navigate("/analytics")} style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 20,
        background: "none", border: "none", cursor: "pointer",
        color: "#e4beba", fontSize: 11, fontFamily: "Inter",
        opacity: 0.6, transition: "opacity 0.2s",
        animation: "zdFadeUp 0.3s ease both",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}>
        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_back</span>
        Analytics
      </button>

      {/* ── Zone header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", flexWrap: "wrap", gap: 16,
        marginBottom: 28, animation: "zdFadeUp 0.4s ease 0.05s both",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "#e5e2e1",
              margin: 0, lineHeight: 1 }}>
              Zone {zone.name}
            </h2>
            <span style={{
              fontSize: 9, fontWeight: 800, color: cfg.color,
              background: cfg.bg, border: `1px solid ${cfg.color}33`,
              borderRadius: 2, padding: "5px 12px",
              textTransform: "uppercase", letterSpacing: "0.14em",
              animation: isCrit ? "zdCritPulse 2s ease infinite" : "none",
            }}>{cfg.label}</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { icon: "corporate_fare", val: zone.mine_name },
              { icon: "location_on",    val: `District: ${zone.district}` },
              { icon: "schedule",       val: `Updated ${timeAgo(zone.last_updated)}` },
            ].map(({ icon, val }) => (
              <span key={val} style={{ display: "flex", alignItems: "center",
                gap: 5, fontSize: 12, color: "#e4beba", opacity: 0.6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
                {val}
              </span>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: "flex", background: "#0e0e0e", padding: 4, borderRadius: 4,
          border: "1px solid rgba(91,64,62,0.1)", flexWrap: "wrap", gap: 2,
        }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              padding: "8px 16px", borderRadius: 2, border: "none",
              background: tab === i
                ? "linear-gradient(135deg,rgba(255,179,173,0.12),rgba(255,84,81,0.08))"
                : "transparent",
              color: tab === i ? "#ffb3ad" : "#e4beba",
              fontSize: 10, fontWeight: 800, fontFamily: "Inter",
              textTransform: "uppercase", letterSpacing: "0.1em",
              cursor: "pointer", transition: "all 0.2s",
              borderBottom: tab === i ? "2px solid #ffb3ad" : "2px solid transparent",
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 24,
          animation: "zdFadeUp 0.35s ease both" }}>

          {/* Geospatial Matrix */}
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 32,
            border: "1px solid rgba(91,64,62,0.1)",
            position: "relative", overflow: "hidden",
          }}>
            {/* Top shimmer line */}
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: 1,
              background: "linear-gradient(90deg,transparent,rgba(255,179,173,0.2),transparent)",
            }} />
            <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba", opacity: 0.6,
              textTransform: "uppercase", letterSpacing: "0.15em",
              display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%",
                background: "#ffb3ad", display: "inline-block" }} />
              Geospatial Matrix
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "28px 40px" }}>
              {[
                { label: "Mine Identifier",      val: zone.mine_name ?? "—" },
                { label: "Administrative District", val: zone.district ?? "—" },
                { label: "Soil / Lithology",     val: zone.soil_type ?? "—" },
                { label: "Avg Slope Gradient",   val: zone.slope_angle != null ? `${zone.slope_angle}°` : "—" },
                { label: "Blast Events (7d)",    val: zone.blast_count_7d ?? 0 },
                { label: "Recent Rainfall",      val: zone.recent_rainfall != null ? `${zone.recent_rainfall}mm` : "—" },
                { label: "Last Landslide",       val: zone.last_landslide ?? "None Recorded" },
                { label: "Operational Status",
                  val: zone.status ?? "monitoring",
                  highlight: true,
                  color: zone.status === "critical" ? "#ff5451"
                    : zone.status === "warning" ? "#ffb95f"
                    : "#4edea3" },
              ].map(({ label, val, highlight, color }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5,
                    textTransform: "uppercase", letterSpacing: "0.12em",
                    margin: "0 0 4px", fontWeight: 300 }}>{label}</p>
                  {highlight ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 6px ${color}`,
                        animation: "zdPulseDot 2s infinite",
                      }} />
                      <p style={{ fontSize: 18, fontWeight: 700, color,
                        margin: 0, textTransform: "capitalize" }}>{val}</p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
                      margin: 0 }}>{val}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Risk Gauge */}
          <div style={{
            background: "#2a2a2a", borderRadius: 4, padding: 32,
            border: "1px solid rgba(91,64,62,0.1)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <span style={{
              position: "absolute", top: 12, right: 14,
              fontSize: 9, color: "#e4beba", opacity: 0.3,
              fontFamily: "monospace",
            }}>SENSOR_ID: RX-{zone.id?.slice(-3).toUpperCase() ?? "000"}</span>

            {/* Conic gauge */}
            <div style={{
              width: 200, height: 200, borderRadius: "50%",
              background: `radial-gradient(closest-side, #131313 78%, transparent 0 100%), conic-gradient(${cfg.color} ${score}%, #201f1f 0)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `inset 0 0 40px rgba(0,0,0,0.6), 0 0 30px ${cfg.color}22`,
              animation: "zdGaugeIn 0.8s ease 0.2s both",
              flexShrink: 0,
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 48, fontWeight: 800, color: "#e5e2e1",
                  margin: 0, lineHeight: 1 }}>
                  {score}<span style={{ fontSize: 22, opacity: 0.5 }}>%</span>
                </p>
                <p style={{ fontSize: 9, fontWeight: 800, color: cfg.color,
                  textTransform: "uppercase", letterSpacing: "0.12em", margin: "4px 0 0" }}>
                  {cfg.label}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: "#e5e2e1",
                marginBottom: 6 }}>Instability Risk Score</h4>
              <p style={{ fontSize: 11, color: "#e4beba", opacity: 0.6,
                fontWeight: 300, lineHeight: 1.6, marginBottom: 16 }}>
                Probability of slope failure based on real-time telemetry.
              </p>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 99,
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(91,64,62,0.15)",
              }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 14, color: "#ffb3ad",
                    animation: "zdPulseDot 2s ease infinite" }}>update</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  textTransform: "uppercase", letterSpacing: "0.12em" }}>
                  Last updated: {timeAgo(zone.last_updated)}
                </span>
              </div>
            </div>
          </div>

          {/* Live alerts stream */}
          <div style={{
            gridColumn: "span 2", background: "#1c1b1b", borderRadius: 4,
            padding: 28, border: "1px solid rgba(91,64,62,0.08)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1",
                textTransform: "uppercase", letterSpacing: "0.14em" }}>
                Live Trigger Stream
              </h3>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#ff5451",
                background: "rgba(255,84,81,0.1)", padding: "3px 8px", borderRadius: 2,
                animation: "zdPulseDot 2s infinite" }}>
                {alerts.filter(a => a.status === "active").length} Active
              </span>
            </div>
            {alerts.length === 0 ? (
              <p style={{ fontSize: 11, color: "#5b403e", textAlign: "center",
                padding: "24px 0" }}>No alerts for this zone</p>
            ) : alerts.slice(0, 3).map((a, i) => (
              <AlertRow key={a.id ?? i} alert={a} idx={i}
                onAck={() => ackAlert(a.id)}
                onResolve={() => resolveAlert(a.id)}
                actioning={actioning} />
            ))}
          </div>
        </div>
      )}

      {/* ══ ALERTS TAB ══ */}
      {tab === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12,
          animation: "zdFadeUp 0.35s ease both" }}>
          {alerts.length === 0 ? (
            <EmptyState icon="notifications" label="No alerts for this zone" />
          ) : alerts.map((a, i) => (
            <AlertRow key={a.id ?? i} alert={a} idx={i}
              onAck={() => ackAlert(a.id)}
              onResolve={() => resolveAlert(a.id)}
              actioning={actioning} expanded />
          ))}
        </div>
      )}

      {/* ══ BLAST EVENTS TAB ══ */}
      {tab === 2 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
          animation: "zdFadeUp 0.35s ease both" }}>
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 28,
            border: "1px solid rgba(91,64,62,0.1)",
          }}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 20 }}>
              Blast Timeline
            </h3>
            {blasts.length === 0 ? (
              <EmptyState icon="bolt" label="No blast events recorded" />
            ) : blasts.map((b, i) => (
              <div key={b.id ?? i} style={{
                paddingLeft: 16, borderLeft: i === 0
                  ? "2px solid #ffb3ad"
                  : "2px solid rgba(91,64,62,0.2)",
                marginBottom: 18, position: "relative",
                animation: `zdFadeUp 0.3s ease ${i * 0.05}s both`,
              }}>
                <div style={{
                  position: "absolute", left: -5, top: 5,
                  width: 8, height: 8, borderRadius: "50%",
                  background: i === 0 ? "#ffb3ad" : "#3a3939",
                  boxShadow: i === 0 ? "0 0 8px rgba(255,179,173,0.5)" : "none",
                }} />
                <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.5,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  margin: "0 0 3px" }}>
                  {new Date(b.blast_date ?? b.created_at).toLocaleString()}
                </p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1",
                  margin: "0 0 2px" }}>
                  Intensity {b.intensity ?? "—"} · Depth {b.depth_meters ?? "—"}m
                </p>
                <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5, margin: 0 }}>
                  {b.explosive_type ? `${b.explosive_type} · ` : ""}
                  Logged: {b.logged_by}
                </p>
              </div>
            ))}
          </div>

          {/* Intensity visualiser */}
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 28,
            border: "1px solid rgba(91,64,62,0.1)",
          }}>
            <h3 style={{ fontSize: 10, fontWeight: 700, color: "#e4beba",
              textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 20 }}>
              Intensity Profile
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end",
              gap: 6, height: 160, marginBottom: 12 }}>
              {(blasts.length > 0 ? blasts : Array(7).fill(null)).slice(0, 10).map((b, i) => {
                const val = b ? (b.intensity ?? 0) : Math.random() * 10;
                const pct = (val / 10) * 100;
                const col = val >= 8 ? "#ff5451" : val >= 5 ? "#ffb95f" : "#4edea3";
                return (
                  <div key={i} style={{ flex: 1, display: "flex",
                    flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "80%", height: `${pct}%`,
                      background: b ? col : "#2a2a2a",
                      borderRadius: "2px 2px 0 0",
                      transition: "height 0.6s ease",
                      animation: `zdBarGrow 0.6s ease ${i * 0.05}s both`,
                      boxShadow: b && val >= 8 ? `0 0 8px ${col}` : "none",
                    }} />
                    <span style={{ fontSize: 8, color: "#e4beba", opacity: 0.4 }}>
                      {b ? `${val.toFixed(1)}` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.3,
                textTransform: "uppercase", letterSpacing: "0.1em" }}>Oldest</span>
              <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.3,
                textTransform: "uppercase", letterSpacing: "0.1em" }}>Latest</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ CRACK REPORTS TAB ══ */}
      {tab === 3 && (
        <div style={{ animation: "zdFadeUp 0.35s ease both" }}>
          {cracks.length === 0 ? (
            <EmptyState icon="running_with_errors" label="No crack reports for this zone" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
              {cracks.map((c, i) => (
                <CrackMiniCard key={c.id ?? i} crack={c} idx={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ WEATHER TAB ══ */}
      {tab === 4 && (
        <div style={{ animation: "zdFadeUp 0.35s ease both" }}>
          <div style={{
            background: "#201f1f", borderRadius: 4, padding: 28,
            border: "1px solid rgba(91,64,62,0.1)",
          }}>
            {forecastFlag && (
              <div style={{
                marginBottom: 16,
                padding: "10px 12px",
                borderRadius: 4,
                border: forecastFlag.auto_flag
                  ? "1px solid rgba(255,84,81,0.35)"
                  : "1px solid rgba(78,222,163,0.35)",
                background: forecastFlag.auto_flag
                  ? "rgba(255,84,81,0.08)"
                  : "rgba(78,222,163,0.08)",
              }}>
                <p style={{
                  margin: 0,
                  fontSize: 10,
                  color: "#e4beba",
                  opacity: 0.85,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}>
                  7-Day Forecast Risk Elevation
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#e5e2e1" }}>
                  Level: <strong style={{ color: forecastFlag.auto_flag ? "#ff5451" : "#4edea3" }}>{forecastFlag.risk_elevation}</strong>
                  {" "}- Forecast total {forecastFlag.forecast_rainfall_total_mm}mm, slope {forecastFlag.slope_angle ?? "—"}°
                </p>
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                  opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.14em",
                  display: "block", marginBottom: 4 }}>Pluviometric Monitoring</span>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: "#e5e2e1",
                  margin: 0 }}>
                  Precipitation Trend
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#ffb3ad",
                    marginLeft: 10 }}>
                    {zone.recent_rainfall != null ? `${zone.recent_rainfall}mm recent` : ""}
                  </span>
                </h3>
              </div>
              <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                {weather.slice(0, 1).map((w, k) => [
                  { l: "Current Rainfall", v: `${w.rainfall_mm?.toFixed(1) ?? "—"}mm/h` },
                  { l: "Humidity",         v: `${w.humidity_percent ?? "—"}%`           },
                  { l: "Wind Speed",       v: w.wind_speed_kmh ? `${w.wind_speed_kmh}km/h` : "—" },
                ].map(({ l, v }, j) => (
                  <div key={j} style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.5,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                      display: "block", marginBottom: 2 }}>{l}</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#e5e2e1" }}>{v}</span>
                  </div>
                )))}
              </div>
            </div>

            {/* Bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end",
              gap: 4, height: 140, marginBottom: 10 }}>
              {(forecast7d.length > 0 ? forecast7d : weather.length > 0 ? weather : Array(12).fill(null)).slice(0, 12).map((w, i) => {
                const val   = w?.rainfall_mm ?? w?.rainfall_mm_24h ?? Math.random() * 10;
                const max   = Math.max(...(forecast7d.map(x => x.rainfall_mm ?? 0)), ...(weather.map(x => x.rainfall_mm ?? 0)), 1);
                const pct   = (val / max) * 100;
                const level = w?.warning_level;
                const col   = level === "extreme" || level === "warning" ? "#ff5451"
                  : level === "watch" ? "#ffb95f" : "rgba(255,179,173,0.35)";
                return (
                  <div key={i} style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 4, position: "relative",
                  }}>
                    {(level === "extreme" || level === "warning") && w && (
                      <span style={{ fontSize: 7, fontWeight: 800, color: "#ff5451",
                        textTransform: "uppercase", marginBottom: 2,
                        animation: "zdPulseDot 2s infinite" }}>CRIT</span>
                    )}
                    <div style={{
                      width: "80%", height: `${Math.max(pct, 4)}%`,
                      background: col, borderRadius: "2px 2px 0 0",
                      transition: "height 0.6s ease",
                      animation: `zdBarGrow 0.6s ease ${i * 0.04}s both`,
                      cursor: "default",
                    }} />
                  </div>
                );
              })}
            </div>
            {forecast7d.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginTop: 6 }}>
                {forecast7d.slice(0, 7).map((d, i) => (
                  <span key={i} style={{ fontSize: 8, color: "#e4beba", opacity: 0.45, textAlign: "center" }}>
                    {new Date(d.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {["00:00","04:00","08:00","12:00","16:00","20:00","23:59"].map(t => (
                  <span key={t} style={{ fontSize: 8, color: "#e4beba", opacity: 0.3,
                    textTransform: "uppercase", letterSpacing: "0.1em" }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FABs ── */}
      <div style={{ position: "fixed", bottom: 32, right: 32,
        display: "flex", flexDirection: "column", gap: 12,
        animation: "zdFadeUp 0.5s ease 0.3s both", zIndex: 50 }}>
        <button
          onClick={runRiskPrediction}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "9px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,179,173,0.35)",
            background: "rgba(42,42,42,0.92)",
            color: "#ffb3ad",
            fontFamily: "Inter",
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(58,57,57,0.95)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(42,42,42,0.92)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Run ML risk prediction"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            psychology
          </span>
          Run Risk Prediction
        </button>

        <FAB icon="layers" onClick={() => navigate("/map")}
          bg="#3a3939" color="#e5e2e1" tip="Map View" />
        <FAB icon="emergency_share" filled onClick={() => navigate("/alerts")}
          bg="linear-gradient(135deg,#ffb3ad,#ff5451)" color="#68000a" tip="Emergency" />
      </div>

      {mlOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 180,
          background: "rgba(8,8,8,0.82)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          animation: "zdModalIn 0.3s ease both",
        }}>
          <div style={{
            width: "min(1200px, 96vw)",
            margin: "22px 0",
            background: "linear-gradient(145deg, #1a1919 0%, #111111 100%)",
            border: "1px solid rgba(91,64,62,0.24)",
            borderRadius: 8,
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "zdPanelIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(91,64,62,0.18)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <p style={{
                  margin: "0 0 4px",
                  fontSize: 10,
                  color: "#e4beba",
                  opacity: 0.55,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                }}>
                  Model2 Risk Predictor Output
                </p>
                <h3 style={{
                  margin: 0,
                  fontSize: 20,
                  color: "#e5e2e1",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}>
                  ML vs Manual Risk Comparison - Zone {zone.name}
                </h3>
              </div>
              <button
                onClick={() => setMlOpen(false)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(91,64,62,0.28)",
                  color: "#e4beba",
                  width: 34,
                  height: 34,
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
              {mlLoading && (
                <div style={{
                  height: 260,
                  borderRadius: 6,
                  background: "#1f1e1e",
                  border: "1px solid rgba(91,64,62,0.15)",
                  animation: "zdShimmer 1.2s ease infinite alternate",
                }} />
              )}

              {!mlLoading && mlError && (
                <div style={{
                  padding: "14px 16px",
                  borderRadius: 4,
                  border: "1px solid rgba(255,84,81,0.3)",
                  background: "rgba(255,84,81,0.09)",
                  color: "#ffb3ad",
                  fontSize: 12,
                }}>
                  {mlError}
                </div>
              )}

              {!mlLoading && mlData && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
                    <div style={{
                      background: "#201f1f",
                      border: "1px solid rgba(91,64,62,0.18)",
                      borderRadius: 6,
                      padding: 18,
                    }}>
                      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#e4beba", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        Predicted ML Risk
                      </p>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ fontSize: 46, lineHeight: 1, fontWeight: 800, color: "#ffb95f" }}>
                          {Math.round((mlData.predicted_risk_score || 0) * 100)}%
                        </span>
                        <span style={{ fontSize: 12, color: "#ffb95f", fontWeight: 700, textTransform: "uppercase" }}>
                          {mlData.predicted_risk_label}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      background: "#201f1f",
                      border: "1px solid rgba(91,64,62,0.18)",
                      borderRadius: 6,
                      padding: 18,
                    }}>
                      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#e4beba", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        Current Manual Risk
                      </p>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                        <span style={{ fontSize: 46, lineHeight: 1, fontWeight: 800, color: cfg.color }}>
                          {Math.round((zone.risk_score || 0) * 100)}%
                        </span>
                        <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700, textTransform: "uppercase" }}>
                          {zone.risk_level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: "#181818",
                    border: "1px solid rgba(91,64,62,0.15)",
                    borderRadius: 6,
                    padding: "14px 16px",
                    marginBottom: 18,
                  }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "#e5e2e1", fontWeight: 700 }}>
                      Comparison Delta
                    </p>
                    <div style={{ height: 8, borderRadius: 99, background: "#252525", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${Math.min(100, Math.abs(Math.round(((mlData.predicted_risk_score || 0) - (zone.risk_score || 0)) * 100)))}%`,
                        background: (mlData.predicted_risk_score || 0) >= (zone.risk_score || 0)
                          ? "linear-gradient(90deg,#ffb95f,#ff5451)"
                          : "linear-gradient(90deg,#4edea3,#ffeb3b)",
                        animation: "zdBarGrow 0.7s ease both",
                      }} />
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: 10, color: "#e4beba", opacity: 0.7 }}>
                      {(mlData.predicted_risk_score || 0) >= (zone.risk_score || 0)
                        ? `ML predicts ${Math.round(((mlData.predicted_risk_score || 0) - (zone.risk_score || 0)) * 100)}% higher risk than manual level.`
                        : `ML predicts ${Math.round(((zone.risk_score || 0) - (mlData.predicted_risk_score || 0)) * 100)}% lower risk than manual level.`}
                    </p>
                  </div>

                  <div style={{
                    background: "#201f1f",
                    border: "1px solid rgba(91,64,62,0.18)",
                    borderRadius: 6,
                    padding: 16,
                  }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: 13, color: "#e5e2e1", fontWeight: 700 }}>
                      Top Contributing Factors
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {getTopFactors(mlData.features_used || {}).map((factor, i) => (
                        <div key={factor.key} style={{
                          borderRadius: 4,
                          padding: "10px 12px",
                          background: "rgba(14,14,14,0.52)",
                          border: "1px solid rgba(91,64,62,0.18)",
                          animation: `zdFadeUp 0.3s ease ${i * 0.06}s both`,
                        }}>
                          <p style={{ margin: "0 0 4px", fontSize: 10, color: "#e4beba", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {factor.label}
                          </p>
                          <p style={{ margin: 0, fontSize: 18, color: "#ffb3ad", fontWeight: 700 }}>
                            {Number.isFinite(factor.value) ? factor.value.toFixed(2) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function AlertRow({ alert: a, idx, onAck, onResolve, actioning, expanded }) {
  const isActive = a.status === "active";
  return (
    <div style={{
      display: "flex", alignItems: expanded ? "flex-start" : "center",
      justifyContent: "space-between", gap: 16,
      padding: 18, background: "#2a2a2a", borderRadius: 4,
      borderLeft: `4px solid ${isActive ? "#ff5451" : "#4edea3"}`,
      animation: `zdFadeUp 0.3s ease ${idx * 0.05}s both`,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: 1 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 2,
          background: isActive ? "rgba(255,84,81,0.1)" : "rgba(78,222,163,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 24, color: isActive ? "#ff5451" : "#4edea3" }}>
            {isActive ? "warning" : "check_circle"}
          </span>
        </div>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 9, fontWeight: 800,
              color: isActive ? "#ff5451" : "#4edea3",
              background: isActive ? "rgba(255,84,81,0.1)" : "rgba(78,222,163,0.08)",
              padding: "2px 8px", borderRadius: 2, textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}>{isActive ? "Active" : a.status}</span>
            <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.4,
              fontFamily: "monospace" }}>
              ID: {a.id?.slice(-6).toUpperCase() ?? "—"}
            </span>
          </div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#e5e2e1",
            margin: "0 0 4px" }}>
            {a.trigger_reason ?? "Alert triggered"}
          </h4>
          {expanded && (
            <p style={{ fontSize: 11, color: "#e4beba", opacity: 0.6, margin: 0 }}>
              Source: {a.source_sensor ?? "Sensor"} · Risk: {a.risk_level?.toUpperCase() ?? "—"}
            </p>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right", marginRight: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#e5e2e1", margin: 0 }}>
            {/* timeAgo */}
            {a.created_at ? new Date(a.created_at).toLocaleTimeString("en-IN",
              { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
          <p style={{ fontSize: 9, color: "#4edea3",
            textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            {a.status}
          </p>
        </div>
        {isActive && (
          <div style={{ display: "flex", gap: 6 }}>
            <ZDBtn label="Acknowledge"
              loading={actioning === a.id}
              onClick={onAck} />
            <ZDBtn label="Resolve" primary
              loading={actioning === a.id + "res"}
              onClick={onResolve} />
          </div>
        )}
      </div>
    </div>
  );
}

function CrackMiniCard({ crack: c, idx }) {
  const [imgErr, setImgErr] = useState(false);
  const score = c.ai_risk_score != null ? Math.round(c.ai_risk_score * 100) : null;
  const col = !score ? "#4edea3" : score >= 80 ? "#ff5451" : score >= 60 ? "#ffb95f" : "#4edea3";

  return (
    <div style={{
      background: "#2a2a2a", borderRadius: 4,
      border: "1px solid rgba(91,64,62,0.12)", overflow: "hidden",
      animation: `zdFadeUp 0.3s ease ${idx * 0.05}s both`,
      transition: "transform 0.2s, box-shadow 0.2s",
      cursor: "pointer",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.4)";
        e.currentTarget.style.borderColor = `${col}33`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(91,64,62,0.12)";
      }}
    >
      {/* Photo */}
      <div style={{ height: 130, background: "#1c1b1b",
        position: "relative", overflow: "hidden" }}>
        {c.photo_url && !imgErr ? (
          <img src={c.photo_url} alt="crack" onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover",
              filter: "grayscale(0.4)", transition: "filter 0.4s, transform 0.4s" }}
            onMouseEnter={e => {
              e.target.style.filter = "grayscale(0)";
              e.target.style.transform = "scale(1.05)";
            }}
            onMouseLeave={e => {
              e.target.style.filter = "grayscale(0.4)";
              e.target.style.transform = "scale(1)";
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 32, color: "#3a3939" }}>image_not_supported</span>
          </div>
        )}
        {score !== null && (
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: `${col}22`, backdropFilter: "blur(8px)",
            border: `1px solid ${col}44`, borderRadius: 2,
            padding: "2px 8px",
          }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: col }}>AI: {score}%</span>
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#e5e2e1",
          margin: "0 0 4px" }}>
          {c.crack_type?.replace(/_/g," ").replace(/\b\w/g,ch=>ch.toUpperCase()) ?? "—"}
        </h4>
        {score !== null && (
          <div style={{ height: 2, background: "#1c1b1b",
            borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${score}%`,
              background: col, animation: "zdBarGrow 0.6s ease both" }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.5 }}>
            {c.reported_by}
          </span>
          <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.4 }}>
            {timeAgo(c.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ZDBtn({ label, onClick, loading, primary }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      padding: "7px 14px", borderRadius: 2,
      background: primary ? "linear-gradient(135deg,#ffb3ad,#ff5451)" : "rgba(58,57,57,0.8)",
      border: primary ? "none" : "1px solid rgba(91,64,62,0.25)",
      color: primary ? "#68000a" : "#e4beba",
      fontSize: 9, fontWeight: 800, fontFamily: "Inter",
      textTransform: "uppercase", letterSpacing: "0.08em",
      cursor: loading ? "wait" : "pointer", opacity: loading ? 0.5 : 1,
      transition: "all 0.2s",
    }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.8"; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
      {loading
        ? <span style={{ width: 8, height: 8,
            border: "1.5px solid rgba(228,190,186,0.3)", borderTopColor: "#e4beba",
            borderRadius: "50%", display: "inline-block",
            animation: "zdSpin 0.7s linear infinite" }} />
        : label}
    </button>
  );
}

function FAB({ icon, onClick, bg, color, filled, tip }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={tip}
      style={{
        width: 52, height: 52, borderRadius: "50%", border: "none",
        background: bg, color, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: hov ? "scale(1.1)" : "scale(1)",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.3)",
        transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 22,
          fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
    </button>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <span className="material-symbols-outlined"
        style={{ fontSize: 48, color: "#3a3939", display: "block", marginBottom: 12 }}>
        {icon}
      </span>
      <p style={{ fontSize: 11, color: "#5b403e",
        textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
    </div>
  );
}

function ZDSkeleton() {
  return (
    <div style={{ padding: "32px", fontFamily: "Inter" }}>
      <div style={{ height: 40, width: 200, background: "#2a2a2a",
        borderRadius: 4, marginBottom: 28,
        animation: "zdShimmer 1.4s ease infinite alternate" }} />
      <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 24 }}>
        <div style={{ height: 360, background: "#2a2a2a", borderRadius: 4,
          animation: "zdShimmer 1.4s ease 0.1s infinite alternate" }} />
        <div style={{ height: 360, background: "#2a2a2a", borderRadius: 4,
          animation: "zdShimmer 1.4s ease 0.2s infinite alternate" }} />
      </div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  @keyframes zdFadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes zdShimmer   { from{opacity:0.25} to{opacity:0.55} }
  @keyframes zdBarGrow   { from{height:0%;width:0%} to{} }
  @keyframes zdGaugeIn   { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes zdModalIn   { from{opacity:0} to{opacity:1} }
  @keyframes zdPanelIn   { from{opacity:0;transform:translateY(20px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes zdPulseDot  { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes zdSpin      { to{transform:rotate(360deg)} }
  @keyframes zdCritPulse { 0%,100%{box-shadow:0 0 8px rgba(255,84,81,0.4)} 50%{box-shadow:0 0 20px rgba(255,84,81,0.8)} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  ::-webkit-scrollbar{width:3px}
  ::-webkit-scrollbar-track{background:#0e0e0e}
  ::-webkit-scrollbar-thumb{background:#3a3939;border-radius:4px}
`;
