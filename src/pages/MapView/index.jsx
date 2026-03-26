import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Polygon, Tooltip, useMap } from "react-leaflet";
import { fetchZones } from "../../api/zones";
import { fetchAlerts } from "../../api/alerts";
import { fetchHistoricalEvents } from "../../api/history";
import { T } from "../../theme/tokens";

// ── Risk colours ───────────────────────────────────────────────
const RISK = {
  red:    { fill: "#ff5451", stroke: "#ff5451", label: "Critical",  badge: "#ff5451" },
  orange: { fill: "#ffb95f", stroke: "#ffb95f", label: "High",      badge: "#ffb95f" },
  yellow: { fill: "#ffeb3b", stroke: "#ffeb3b", label: "Elevated",  badge: "#ffeb3b" },
  green:  { fill: "#4edea3", stroke: "#4edea3", label: "Stable",    badge: "#4edea3" },
};

const getZoneCoordinates = (zone) => zone?.latlngs || zone?.coordinates || [];

// ── Zoom controller component ──────────────────────────────────
function MapControls({ onLocate }) {
  const map = useMap();
  return (
    <div style={{
      position: "absolute",
      bottom: 64, right: selectedPanel ? 348 : 24,
      zIndex: 1000, display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{
        display: "flex", flexDirection: "column",
        background: "rgba(28,27,27,0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(91,64,62,0.2)",
        borderRadius: 2, overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}>
        {[
          { icon: "add",         action: () => map.zoomIn()  },
          { icon: "remove",      action: () => map.zoomOut() },
          { icon: "my_location", action: () => map.setView([19.7515, 75.7139], 7) },
        ].map(({ icon, action }, i) => (
          <button key={icon} onClick={action} style={{
            padding: "10px 12px", background: "transparent",
            border: "none",
            borderBottom: i < 2 ? "1px solid rgba(91,64,62,0.15)" : "none",
            color: "#e4beba", cursor: "pointer", lineHeight: 1,
            transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#3a3939"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 16 }}>{icon}</span>
          </button>
        ))}
      </div>
      <button style={{
        padding: "10px 12px", background: "rgba(28,27,27,0.9)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(91,64,62,0.2)",
        borderRadius: 2, color: "#e4beba", cursor: "pointer",
        lineHeight: 1, transition: "all 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.color = "#ffb3ad"}
        onMouseLeave={e => e.currentTarget.style.color = "#e4beba"}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>layers</span>
      </button>
    </div>
  );
}
// need selectedPanel in scope — will inline below

// ── Mini bar chart for movement velocity ───────────────────────
function VelocityChart({ risk }) {
  const bars = [20, 25, 35, 45, 65, 75, 95];
  const color = RISK[risk]?.fill || "#ffb3ad";
  return (
    <div style={{
      height: 64, display: "flex",
      alignItems: "flex-end", gap: 3, padding: "0 4px",
    }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`,
          background: i >= 4 ? color : `${color}33`,
          borderRadius: "1px 1px 0 0",
          transition: "height 0.4s ease",
          animation: `barRise 0.5s ease ${i * 0.06}s both`,
        }} />
      ))}
    </div>
  );
}

export default function MapViewPage() {
  const navigate = useNavigate();

  const [zones,      setZones]      = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [selected,   setSelected]   = useState(null);   // selected zone obj
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [historyPayload, setHistoryPayload] = useState({ count: 0, season_summary: { monsoon: 0, dry: 0 }, events: [] });
  const [replayYear, setReplayYear] = useState("all");

  // Filter state
  const [district,    setDistrict]    = useState("All");
  const [activeRisks, setActiveRisks] = useState(["red","orange","yellow","green"]);

  const CENTER = [19.7515, 75.7139];

  useEffect(() => {
    setTimeout(() => setMounted(true), 60);
    Promise.allSettled([fetchZones(), fetchAlerts({ status: "active" }), fetchHistoricalEvents()])
      .then(([z, a, h]) => {
        if (z.status === "fulfilled") setZones(z.value ?? []);
        if (a.status === "fulfilled") setAlerts(a.value ?? []);
        if (h.status === "fulfilled") setHistoryPayload(h.value ?? { count: 0, season_summary: { monsoon: 0, dry: 0 }, events: [] });
      });
  }, []);

  const toggleRisk = (r) => setActiveRisks(prev =>
    prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
  );

  const filteredZones = zones.filter(z => {
    const districtOk = district === "All" || z.district === district;
    const riskOk     = activeRisks.includes(z.risk_level);
    return districtOk && riskOk;
  });

  const zoneAlerts = selected
    ? alerts.filter(a => a.zone_id === selected.id)
    : [];

  const historicalEvents = historyPayload?.events || [];
  const replayYears = [
    "all",
    ...new Set(
      historicalEvents
        .map((e) => String(e.date || "").slice(0, 4))
        .filter((y) => /^\d{4}$/.test(y))
    ),
  ];

  const replayRows = replayYear === "all"
    ? historicalEvents
    : historicalEvents.filter((e) => String(e.date || "").startsWith(`${replayYear}-`));

  const replayByZone = replayRows.reduce((acc, row) => {
    const key = String(row.zone_id || "");
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const districts = ["All", ...new Set(zones.map(z => z.district).filter(Boolean))];

  const handleZoneClick = (zone) => {
    setSelected(zone);
    setDrawerOpen(true);
  };

  return (
    <div style={{
      position: "fixed",
      top: 64, left: "var(--sidebar-w, 256px)", right: 0, bottom: 0,
      background: "#131313", overflow: "hidden",
      fontFamily: "Inter, sans-serif",
      transition: "left 0.28s ease",
    }}>

      {/* ── Actual Leaflet Map ── */}
      <MapContainer
        center={CENTER} zoom={7}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CartoDB"
        />

        {filteredZones.map(zone => getZoneCoordinates(zone)?.length > 0 && (
          <Polygon
            key={zone.id}
            className={`zone-poly zone-risk-${zone.risk_level || "green"}`}
            positions={getZoneCoordinates(zone)}
            pathOptions={{
              fillColor:   RISK[zone.risk_level]?.fill   || "#ffb3ad",
              color:       RISK[zone.risk_level]?.stroke || "#ffb3ad",
              fillOpacity: selected?.id === zone.id
                ? 0.68
                : zone.risk_level === "red"
                  ? 0.4
                  : zone.risk_level === "orange"
                    ? 0.34
                    : 0.3,
              weight:      selected?.id === zone.id ? 2.5 : (replayByZone[zone.id] ? 2.2 : 1.5),
              dashArray: replayByZone[zone.id] ? "6 4" : undefined,
            }}
            eventHandlers={{ click: () => handleZoneClick(zone) }}
          >
            <Tooltip sticky>
              <span style={{ fontSize: 11, fontFamily: "Inter" }}>
                {zone.name} — {RISK[zone.risk_level]?.label || zone.risk_level?.toUpperCase()}
                {replayByZone[zone.id] ? ` • ${replayByZone[zone.id]} historical events` : ""}
              </span>
            </Tooltip>
          </Polygon>
        ))}

        <InlineMapControls drawerOpen={drawerOpen} />
      </MapContainer>

      {/* ── LEFT FILTER PANEL ── */}
      <div style={{
        position: "absolute", top: 24, left: 24,
        width: 272, zIndex: 20,
        display: "flex", flexDirection: "column", gap: 12,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}>

        {/* Filter card */}
        <div style={{
          background: "rgba(28,27,27,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(91,64,62,0.12)",
          borderRadius: 4, padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.15em",
              color: "#e4beba" }}>Sentinel Filters</span>
            <span className="material-symbols-outlined"
              style={{ fontSize: 16, color: "#e4beba", cursor: "pointer" }}>
              filter_list_off
            </span>
          </div>

          {/* District */}
          <div style={{ marginBottom: 20 }}>
            <label style={filterLabel}>Focus District</label>
            <div style={{ position: "relative" }}>
              <select value={district} onChange={e => setDistrict(e.target.value)}
                style={{
                  width: "100%", background: "rgba(42,42,42,0.5)",
                  border: "none", color: "#e5e2e1",
                  padding: "9px 28px 9px 10px",
                  fontSize: 12, fontFamily: "Inter",
                  borderRadius: 2, appearance: "none",
                  outline: "none", cursor: "pointer",
                }}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="material-symbols-outlined" style={{
                position: "absolute", right: 8, top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14, color: "#e4beba", pointerEvents: "none",
              }}>expand_more</span>
            </div>
          </div>

          {/* Risk toggles */}
          <div style={{ marginBottom: 20 }}>
            <label style={filterLabel}>Hazard Risk Threshold</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { key: "red",    label: "Critical", color: "#ff5451" },
                { key: "orange", label: "High",     color: "#ffb95f" },
                { key: "green",  label: "Stable",   color: "#4edea3" },
                { key: "yellow", label: "Elevated", color: "#ffeb3b" },
              ].map(({ key, label, color }) => {
                const on = activeRisks.includes(key);
                return (
                  <button key={key} onClick={() => toggleRisk(key)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "7px 8px", borderRadius: 2, cursor: "pointer",
                    border: `1px solid ${on ? color + "40" : "rgba(91,64,62,0.15)"}`,
                    background: on ? `${color}12` : "transparent",
                    opacity: on ? 1 : 0.45,
                    transition: "all 0.2s",
                    fontFamily: "Inter",
                  }}>
                    <div style={{
                      width: 6, height: 6,
                      borderRadius: "50%", background: color,
                      boxShadow: on ? `0 0 6px ${color}` : "none",
                    }} />
                    <span style={{ fontSize: 10, fontWeight: 700,
                      color, textTransform: "uppercase" }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle */}
          <div style={{
            paddingTop: 16, borderTop: "1px solid rgba(91,64,62,0.12)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 10, fontWeight: 700,
              color: "#e5e2e1", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Active Monitoring
            </span>
            <div style={{
              width: 32, height: 16, borderRadius: 99,
              background: "#ffb3ad", position: "relative",
              cursor: "pointer",
              boxShadow: "0 0 10px rgba(255,179,173,0.3)",
            }}>
              <div style={{
                position: "absolute", right: 2, top: 2,
                width: 12, height: 12,
                borderRadius: "50%", background: "#fff",
              }} />
            </div>
          </div>
        </div>

        {/* Tooltip hint */}
        <div style={{
          background: "rgba(42,42,42,0.7)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(91,64,62,0.1)",
          borderRadius: 2, padding: "10px 14px",
        }}>
          <p style={{ fontSize: 10, color: "#e4beba", lineHeight: 1.6, margin: 0 }}>
            Select a{" "}
            <span style={{ color: "#ffb3ad", fontWeight: 700 }}>Zone</span>
            {" "}polygon to reveal granular geotechnical data and sensor health.
          </p>
        </div>

        <div style={{
          background: "rgba(28,27,27,0.86)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(91,64,62,0.14)",
          borderRadius: 4,
          padding: 14,
        }}>
          <p style={{ margin: "0 0 8px", fontSize: 9, color: "#e4beba", opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Historical Landslide Replay
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span className="material-symbols-outlined" style={{ color: "#ffb95f", fontSize: 16 }}>history</span>
            <select
              value={replayYear}
              onChange={(e) => setReplayYear(e.target.value)}
              style={{
                flex: 1,
                background: "#1c1b1b",
                border: "1px solid rgba(91,64,62,0.2)",
                color: "#e5e2e1",
                borderRadius: 2,
                fontSize: 11,
                padding: "6px 8px",
                fontFamily: "Inter",
              }}
            >
              {replayYears.map((y) => (
                <option key={y} value={y}>{y === "all" ? "All Years" : y}</option>
              ))}
            </select>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(replayYears.length - 1, 0)}
            value={Math.max(0, replayYears.indexOf(replayYear))}
            onChange={(e) => setReplayYear(replayYears[Number(e.target.value)] || "all")}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "#e4beba", opacity: 0.6 }}>
            <span>Events: {replayRows.length}</span>
            <span>Zones highlighted: {Object.keys(replayByZone).length}</span>
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ background: "#1c1b1b", borderRadius: 2, padding: "6px 8px" }}>
              <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.6 }}>Monsoon</span>
              <p style={{ margin: "2px 0 0", color: "#4edea3", fontWeight: 700 }}>{historyPayload?.season_summary?.monsoon ?? 0}</p>
            </div>
            <div style={{ background: "#1c1b1b", borderRadius: 2, padding: "6px 8px" }}>
              <span style={{ fontSize: 9, color: "#e4beba", opacity: 0.6 }}>Dry</span>
              <p style={{ margin: "2px 0 0", color: "#ffb95f", fontWeight: 700 }}>{historyPayload?.season_summary?.dry ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT DRAWER PANEL ── */}
      <div style={{
        position: "absolute", top: 0, bottom: 0,
        right: drawerOpen ? 0 : -340,
        width: 320, zIndex: 30,
        background: "#0e0e0e",
        border: "1px solid rgba(91,64,62,0.2)",
        boxShadow: "-20px 0 40px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
        transition: "right 0.35s cubic-bezier(0.4,0,0.2,1)",
      }}>

        {selected && (
          <>
            {/* Hero image */}
            <div style={{ height: 130, position: "relative", flexShrink: 0 }}>
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(135deg, ${RISK[selected.risk_level]?.fill}22, #0e0e0e)`,
              }} />
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `radial-gradient(circle at 30% 50%, rgba(255,179,173,0.05) 0%, transparent 60%)`,
              }} />
              {/* Close */}
              <button onClick={() => { setDrawerOpen(false); setSelected(null); }} style={{
                position: "absolute", top: 12, right: 12,
                background: "rgba(58,57,57,0.8)", border: "none",
                color: "#e4beba", cursor: "pointer", borderRadius: 2,
                padding: 6, lineHeight: 1,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "#ffb3ad"}
                onMouseLeave={e => e.currentTarget.style.color = "#e4beba"}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 16 }}>close</span>
              </button>
              {/* Zone name */}
              <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e5e2e1",
                  margin: "0 0 4px", letterSpacing: "-0.02em" }}>
                  {selected.name}
                </h2>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: RISK[selected.risk_level]?.fill,
                  textTransform: "uppercase", letterSpacing: "0.15em",
                }}>
                  {RISK[selected.risk_level]?.label} Risk
                </span>
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 20px 0",
              display: "flex", flexDirection: "column", gap: 24,
            }}>

              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Mine Entity",  val: selected.mine_name || "—" },
                  { label: "District",     val: selected.district  || "—" },
                  { label: "Risk Status",  val: RISK[selected.risk_level]?.label || "—",
                    color: RISK[selected.risk_level]?.fill },
                  { label: "Coordinates", val: getZoneCoordinates(selected)?.length > 0
                    ? `${getZoneCoordinates(selected)[0][0]?.toFixed(3)}°N`
                    : "—" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{
                    animation: "fadeUp 0.3s ease both",
                  }}>
                    <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.7,
                      textTransform: "uppercase", letterSpacing: "0.12em",
                      marginBottom: 4, fontWeight: 600 }}>{label}</p>
                    {color ? (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color,
                        background: `${color}15`,
                        padding: "2px 8px", borderRadius: 2,
                        textTransform: "uppercase",
                      }}>{val}</span>
                    ) : (
                      <p style={{ fontSize: 12, fontWeight: 700,
                        color: "#e5e2e1", margin: 0 }}>{val}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Geotechnical metrics */}
              <div>
                <p style={sectionLabel}>Live Geotechnical Metrics</p>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                }}>
                  <Metric label="Blast Count"
                    value={selected.blast_count ?? "—"}
                    accent={RISK[selected.risk_level]?.fill} mono />
                  <Metric label="Rainfall (mm)"
                    value={selected.rainfall_mm ?? "—"} mono />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Metric label="Crack Formations"
                      value={selected.crack_count ?? "—"}
                      accent="#ff5451"
                      sub="+1 Last 24h"
                      icon="trending_up"
                      mono wide />
                  </div>
                </div>
              </div>

              {/* Movement velocity chart */}
              <div>
                <p style={sectionLabel}>Movement Velocity (mm/h)</p>
                <div style={{
                  background: "#1c1b1b", borderRadius: 2, padding: "12px 8px",
                  animation: "fadeUp 0.4s ease 0.15s both",
                }}>
                  <VelocityChart risk={selected.risk_level} />
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    marginTop: 6,
                  }}>
                    {["M","T","W","T","F","S","S"].map((d, i) => (
                      <span key={i} style={{ fontSize: 9,
                        color: "#e4beba", opacity: 0.4, flex: 1,
                        textAlign: "center" }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active alerts for this zone */}
              {zoneAlerts.length > 0 && (
                <div>
                  <p style={sectionLabel}>Active Alerts ({zoneAlerts.length})</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {zoneAlerts.slice(0, 3).map(a => (
                      <div key={a.id} style={{
                        background: "#1c1b1b", borderRadius: 2,
                        padding: "10px 12px",
                        borderLeft: `2px solid ${RISK[a.risk_level]?.fill || "#ffb3ad"}`,
                        animation: "fadeUp 0.3s ease both",
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 700,
                          color: "#e5e2e1", margin: "0 0 4px" }}>
                          {a.trigger_reason?.slice(0, 50) || "Risk alert triggered"}
                        </p>
                        <p style={{ fontSize: 10, color: "#e4beba",
                          opacity: 0.6, margin: 0 }}>
                          {a.status?.toUpperCase()} • {a.created_at
                            ? new Date(a.created_at).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 8 }} />
            </div>

            {/* Footer CTA */}
            <div style={{
              padding: 20, flexShrink: 0,
              background: "rgba(28,27,27,0.6)",
              borderTop: "1px solid rgba(91,64,62,0.12)",
            }}>
              <button
                onClick={() => navigate(`/zones/${selected.id}`)}
                style={{
                  width: "100%", padding: "12px 0",
                  background: "linear-gradient(135deg, #ffb3ad, #ff5451)",
                  color: "#68000a", border: "none", borderRadius: 2,
                  fontSize: 10, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.2em",
                  cursor: "pointer", fontFamily: "Inter",
                  transition: "all 0.2s",
                  boxShadow: "0 4px 20px rgba(255,179,173,0.2)",
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                View Full Geotechnical Report
              </button>
            </div>
          </>
        )}

        {/* Empty state when no zone selected */}
        {!selected && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 12, padding: 32,
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 48, color: "#3a3939" }}>
              touch_app
            </span>
            <p style={{ fontSize: 11, color: "#5b403e", textAlign: "center",
              textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Select a zone polygon to view details
            </p>
          </div>
        )}
      </div>

      {/* ── BOTTOM LEGEND ── */}
      <div style={{
        position: "absolute", bottom: 40,
        left: 24, zIndex: 20,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 20,
          background: "rgba(14,14,14,0.9)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(91,64,62,0.12)",
          borderRadius: 4, padding: "12px 20px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}>
          {[
            { color: "#ff5451", label: "Critical Risk" },
            { color: "#ffb95f", label: "Moderate Warning" },
            { color: "#4edea3", label: "Stable Terrain" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: color,
                boxShadow: `0 0 6px ${color}88`,
                animation: color === "#ff5451" ? "legendPulse 2s infinite" : "none",
              }} />
              <span style={{ fontSize: 9, fontWeight: 700,
                color: "#e4beba", textTransform: "uppercase",
                letterSpacing: "0.12em" }}>{label}</span>
            </div>
          ))}
          <div style={{
            paddingLeft: 16,
            borderLeft: "1px solid rgba(91,64,62,0.2)",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700,
              color: "#ffb3ad", textTransform: "uppercase",
              letterSpacing: "0.1em" }}>
              LAST UPDATED: 2M AGO
            </span>
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        height: 32, zIndex: 20,
        background: "rgba(14,14,14,0.7)",
        backdropFilter: "blur(8px)",
        borderTop: "1px solid rgba(91,64,62,0.1)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "0 20px",
      }}>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            `Lat: 18.5204 N / Long: 73.8567 E`,
            `Alt: 560m ASL`,
            `Zones: ${filteredZones.length} visible`,
          ].map(t => (
            <span key={t} style={{ fontSize: 9, fontFamily: "monospace",
              color: "rgba(228,190,186,0.4)",
              textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4edea3",
            animation: "legendPulse 2s infinite",
          }} />
          <span style={{ fontSize: 9, fontWeight: 700,
            color: "#e4beba", textTransform: "uppercase",
            letterSpacing: "0.12em" }}>
            Telemetry Feed Active
          </span>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes barRise {
          from { transform: scaleY(0); transform-origin: bottom; }
          to   { transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes legendPulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.35; }
        }
        @keyframes zonePulseRed {
          0%, 100% { fill-opacity: 0.4; }
          50% { fill-opacity: 0.7; }
        }
        @keyframes zonePulseOrange {
          0%, 100% { fill-opacity: 0.32; }
          50% { fill-opacity: 0.52; }
        }
        .leaflet-interactive.zone-poly.zone-risk-red {
          animation: zonePulseRed 3s ease-in-out infinite;
        }
        .leaflet-interactive.zone-poly.zone-risk-orange {
          animation: zonePulseOrange 3.8s ease-in-out infinite;
        }
        .leaflet-container { background: #131313 !important; }
        .leaflet-tooltip {
          background: rgba(14,14,14,0.9) !important;
          border: 1px solid rgba(91,64,62,0.2) !important;
          color: #e5e2e1 !important;
          font-family: Inter !important;
          font-size: 11px !important;
          border-radius: 2px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        select option { background: #1c1b1b; color: #e5e2e1; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: #0e0e0e; }
        ::-webkit-scrollbar-thumb { background: #3a3939; border-radius: 10px; }
      `}</style>
    </div>
  );
}

// ── Inline map controls (needs useMap hook inside MapContainer) ─
function InlineMapControls({ drawerOpen }) {
  const map = useMap();
  return (
    <div style={{
      position: "absolute",
      bottom: 64,
      right: drawerOpen ? 344 : 20,
      zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 8,
      transition: "right 0.35s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{
        display: "flex", flexDirection: "column",
        background: "rgba(28,27,27,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(91,64,62,0.2)",
        borderRadius: 2,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        {[
          { icon: "add",         fn: () => map.zoomIn()  },
          { icon: "remove",      fn: () => map.zoomOut() },
          { icon: "my_location", fn: () => map.setView([19.7515, 75.7139], 7) },
        ].map(({ icon, fn }, i) => (
          <button key={icon} onClick={fn} style={{
            padding: "10px 12px", background: "transparent", border: "none",
            borderBottom: i < 2 ? "1px solid rgba(91,64,62,0.15)" : "none",
            color: "#e4beba", cursor: "pointer",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#3a3939"; e.currentTarget.style.color = "#ffb3ad"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#e4beba"; }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
          </button>
        ))}
      </div>
      <button style={{
        padding: "10px 12px",
        background: "rgba(28,27,27,0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(91,64,62,0.2)",
        borderRadius: 2, color: "#e4beba", cursor: "pointer",
        transition: "all 0.2s",
      }}
        onMouseEnter={e => { e.currentTarget.style.color = "#ffb3ad"; e.currentTarget.style.background = "#3a3939"; }}
        onMouseLeave={e => { e.currentTarget.style.color = "#e4beba"; e.currentTarget.style.background = "rgba(28,27,27,0.92)"; }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>layers</span>
      </button>
    </div>
  );
}

// ── Metric tile ────────────────────────────────────────────────
function Metric({ label, value, accent, sub, icon, mono, wide }) {
  return (
    <div style={{
      background: "#1c1b1b", padding: "12px 14px",
      borderLeft: accent ? `2px solid ${accent}` : "none",
      borderRadius: 2,
      animation: "fadeUp 0.3s ease both",
      display: "flex", justifyContent: "space-between",
      alignItems: wide ? "center" : "flex-start",
    }}>
      <div>
        <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.6,
          textTransform: "uppercase", letterSpacing: "0.1em",
          margin: "0 0 6px" }}>{label}</p>
        <p style={{
          fontSize: 22, fontWeight: 700, color: "#e5e2e1",
          fontFamily: mono ? "monospace" : "Inter",
          margin: 0, lineHeight: 1,
        }}>
          {String(value).padStart(2, "0")}
          {sub && (
            <span style={{ fontSize: 9, fontWeight: 700,
              color: accent || "#ffb3ad", marginLeft: 8 }}>
              {sub}
            </span>
          )}
        </p>
      </div>
      {icon && (
        <span className="material-symbols-outlined"
          style={{ color: accent || "#ffb3ad", fontSize: 20 }}>
          {icon}
        </span>
      )}
    </div>
  );
}

const filterLabel = {
  display: "block", fontSize: 9, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.15em",
  color: "#e4beba", marginBottom: 8,
};

const sectionLabel = {
  fontSize: 9, fontWeight: 700, color: "#e4beba", opacity: 0.7,
  textTransform: "uppercase", letterSpacing: "0.15em",
  marginBottom: 12, marginTop: 0,
};
