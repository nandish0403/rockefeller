import { useEffect, useMemo, useState } from "react";
import { createExploration, fetchExplorations } from "../../api/explorations";
import { fetchZones } from "../../api/zones";

const EMPTY_FORM = {
  zone_id: "",
  log_date: "",
  activity_type: "drilling",
  depth_m: "",
  moisture_pct: "45",
  water_encountered: true,
  water_depth_m: "",
  soil_description: "",
  remarks: "",
};

const UI = {
  surfaceLowest: "#0e0e0e",
  surfaceLow: "#1c1b1b",
  surface: "#201f1f",
  surfaceHigh: "#2a2a2a",
  surfaceBright: "#3a3939",
  outline: "rgba(91,64,62,0.15)",
  text: "#e5e2e1",
  textMuted: "#e4beba",
  primary: "#ffb3ad",
  primaryStrong: "#ff5451",
  secondary: "#ffb95f",
  tertiary: "#4edea3",
};

const ACTIVITY_CHOICES = [
  { value: "drilling", label: "Drilling" },
  { value: "surveying", label: "Trenching" },
  { value: "sampling", label: "Sampling" },
];

function moistureLevelFromPct(raw) {
  const n = Number(raw || 0);
  if (n >= 80) return "saturated";
  if (n >= 55) return "wet";
  if (n >= 30) return "moist";
  return "dry";
}

function pctFromMoistureLevel(level) {
  if (level === "saturated") return 95;
  if (level === "wet") return 70;
  if (level === "moist") return 45;
  return 15;
}

export default function ExplorationsPage() {
  const [zones, setZones] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inlineStatus, setInlineStatus] = useState("");

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === form.zone_id),
    [zones, form.zone_id],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const drills = rows.filter((r) => String(r.activity_type || "").toLowerCase() === "drilling").length;
    return { total, drills };
  }, [rows]);

  const saturationBars = useMemo(() => {
    const sample = (rows || []).slice(0, 7).reverse();
    if (!sample.length) return [30, 45, 25, 60, 80, 55, 95];
    return sample.map((r) => pctFromMoistureLevel(r.moisture_level));
  }, [rows]);

  const load = async (zoneId) => {
    setLoading(true);
    try {
      const [zoneList, logs] = await Promise.all([
        zones.length ? Promise.resolve(zones) : fetchZones().catch(() => []),
        fetchExplorations({ zone_id: zoneId || undefined, limit: 50 }).catch(() => []),
      ]);
      if (!zones.length) setZones(zoneList || []);
      setRows(logs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones().then((data) => setZones(data || [])).catch(() => setZones([]));
  }, []);

  useEffect(() => {
    load(form.zone_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.zone_id]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setInlineStatus("");

    try {
      const moistureLevel = moistureLevelFromPct(form.moisture_pct);

      const payload = {
        zone_id: form.zone_id,
        log_date: form.log_date,
        activity_type: form.activity_type,
        depth_m: form.depth_m === "" ? null : Number(form.depth_m),
        water_encountered: !!form.water_encountered,
        water_depth_m: form.water_encountered && form.water_depth_m !== "" ? Number(form.water_depth_m) : null,
        soil_description: form.soil_description,
        moisture_level: moistureLevel,
        remarks: form.remarks || null,
      };

      const res = await createExploration(payload);
      await load(form.zone_id);

      if (payload.water_encountered) {
        setInlineStatus(`Soil saturation index updated (${res?.zone_saturation_index ?? "-"}). Risk re-forecast queued.`);
      } else {
        setInlineStatus("Exploration log submitted and risk re-forecast queued.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to submit exploration log.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", color: UI.text, overflow: "hidden" }}>
      <div style={{
        background: UI.surface,
        borderBottom: `1px solid ${UI.outline}`,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        animation: "expFade 360ms ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="material-symbols-outlined" style={{ color: UI.primary, fontSize: 16 }}>info</span>
          <p style={{ margin: 0, fontSize: 11, color: UI.textMuted, letterSpacing: "0.05em" }}>
            {inlineStatus || "Soil saturation updates trigger zone re-forecast in the background."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: UI.primary, animation: "dotPulse 1.7s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: UI.primary, fontWeight: 800 }}>Live Stream Active</span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <section style={{ width: "40%", minWidth: 420, background: UI.surfaceLow, borderRight: `1px solid ${UI.outline}`, padding: "28px 24px", overflowY: "auto", animation: "expFade 420ms ease both" }}>
          <div style={{ maxWidth: 540, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: UI.text }}>New Exploration Entry</h2>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: UI.textMuted, opacity: 0.8 }}>
                Populate geospatial core samples into the sentinel network.
              </p>
            </div>

            {error ? (
              <div style={{ background: "rgba(255,84,81,0.14)", border: "1px solid rgba(255,84,81,0.34)", color: "#ffb4ab", borderRadius: 8, padding: "10px 12px", fontSize: 12, marginBottom: 14 }}>
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Zone</label>
                  <select value={form.zone_id} onChange={(e) => set("zone_id", e.target.value)} required style={inputStyle}>
                    <option value="">Select zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name} ({z.district})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Log Date</label>
                  <input type="date" value={form.log_date} onChange={(e) => set("log_date", e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Activity Type</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {ACTIVITY_CHOICES.map((choice) => {
                    const active = form.activity_type === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        onClick={() => set("activity_type", choice.value)}
                        style={{
                          borderRadius: 4,
                          border: active ? "1px solid rgba(255,179,173,0.3)" : "1px solid rgba(91,64,62,0.2)",
                          background: active ? UI.primary : UI.surfaceHigh,
                          color: active ? "#68000a" : UI.textMuted,
                          fontSize: 11,
                          fontWeight: active ? 800 : 600,
                          padding: "9px 8px",
                          cursor: "pointer",
                          transition: "all 180ms ease",
                        }}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Depth (meters)</label>
                  <input type="number" step="0.01" min="0" value={form.depth_m} onChange={(e) => set("depth_m", e.target.value)} style={inputStyle} placeholder="0.00" />
                </div>
                <div>
                  <label style={labelStyle}>Moisture Level (%)</label>
                  <input type="number" min="0" max="100" value={form.moisture_pct} onChange={(e) => set("moisture_pct", e.target.value)} style={inputStyle} placeholder="45" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Soil Description</label>
                <textarea rows={3} value={form.soil_description} onChange={(e) => set("soil_description", e.target.value)} required placeholder="Describe soil composition, grain size, and consistency..." style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              <div style={{
                background: "rgba(42,42,42,0.4)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(91,64,62,0.15)",
                borderLeft: "1px solid rgba(91,64,62,0.15)",
                borderRadius: 10,
                padding: 14,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ color: UI.primaryStrong, fontSize: 18 }}>opacity</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: UI.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>Water Encountered</span>
                  </div>
                  <label style={{ position: "relative", width: 36, height: 20, display: "inline-block" }}>
                    <input
                      type="checkbox"
                      checked={form.water_encountered}
                      onChange={(e) => set("water_encountered", e.target.checked)}
                      style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
                    />
                    <span style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background: form.water_encountered ? UI.primaryStrong : UI.surfaceBright,
                      transition: "all 180ms ease",
                    }} />
                    <span style={{
                      position: "absolute",
                      top: 2,
                      left: form.water_encountered ? 18 : 2,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#f3f3f3",
                      transition: "left 180ms ease",
                    }} />
                  </label>
                </div>

                <div style={{ display: "grid", gap: 6, maxHeight: form.water_encountered ? 80 : 0, opacity: form.water_encountered ? 1 : 0, overflow: "hidden", transition: "max-height 220ms ease, opacity 220ms ease" }}>
                  <label style={labelStyle}>Water Depth (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.water_depth_m}
                    onChange={(e) => set("water_depth_m", e.target.value)}
                    disabled={!form.water_encountered}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Remarks</label>
                <input value={form.remarks} onChange={(e) => set("remarks", e.target.value)} style={inputStyle} placeholder="Internal maintenance notes..." />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 2,
                  border: "none",
                  borderRadius: 4,
                  background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                  color: "#68000a",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 800,
                  padding: "14px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 8px 22px rgba(255,84,81,0.2)",
                  animation: "expGlow 2.8s ease-in-out infinite",
                }}
              >
                <span>{submitting ? "Submitting..." : "Submit Exploration Log"}</span>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
              </button>
            </form>
          </div>
        </section>

        <section style={{ flex: 1, background: "#131313", padding: "28px 24px", overflow: "hidden", display: "flex", flexDirection: "column", animation: "expFade 460ms ease both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: UI.text }}>
                Recent Explorations {selectedZone ? `- ${selectedZone.name}` : ""}
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: UI.textMuted, opacity: 0.78 }}>
                Live telemetry feed from the field teams.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={smallBtnStyle}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>filter_list</span>Filter</button>
              <button style={smallBtnStyle}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Export</button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{
              background: "rgba(42,42,42,0.4)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(91,64,62,0.15)",
              borderLeft: "1px solid rgba(91,64,62,0.15)",
              borderRadius: 12,
              overflow: "hidden",
              borderRight: `1px solid ${UI.outline}`,
              borderBottom: `1px solid ${UI.outline}`,
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                <thead>
                  <tr style={{ background: "rgba(42,42,42,0.5)", borderBottom: "1px solid rgba(91,64,62,0.1)" }}>
                    {[
                      "Zone",
                      "Activity",
                      "Moisture",
                      "Water",
                      "W. Depth",
                      "Trigger Status",
                    ].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={emptyStyle}>Loading exploration logs...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} style={emptyStyle}>No exploration logs found.</td></tr>
                  ) : (
                    rows.slice(0, 14).map((row, idx) => {
                      const moisturePct = pctFromMoistureLevel(row.moisture_level);
                      const statusTag = row.water_encountered ? (moisturePct >= 80 ? "Critical" : moisturePct >= 55 ? "Nominal" : "Stable") : "Stable";
                      const statusColor = statusTag === "Critical" ? "#ff5451" : statusTag === "Nominal" ? "#ffb95f" : "#4edea3";
                      return (
                        <tr key={row.id} style={{
                          background: idx % 2 === 1 ? "rgba(28,27,27,0.35)" : "transparent",
                          borderBottom: "1px solid rgba(91,64,62,0.08)",
                        }}>
                          <td style={{ ...tdStyle, fontWeight: 700 }}>{row.zone_name}</td>
                          <td style={{ ...tdStyle, color: UI.textMuted }}>{row.activity_type}</td>
                          <td style={{ ...tdStyle, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{moisturePct}%</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {row.water_encountered ? (
                              <span className="material-symbols-outlined" style={{ color: UI.primaryStrong, fontVariationSettings: "'FILL' 1", fontSize: 16 }}>water_drop</span>
                            ) : (
                              <span className="material-symbols-outlined" style={{ color: "rgba(228,190,186,0.25)", fontSize: 16 }}>block</span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{row.water_depth_m ?? "-"}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <span style={{
                              background: `${statusColor}1a`,
                              color: statusColor,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              borderRadius: 3,
                              padding: "3px 8px",
                              letterSpacing: "0.06em",
                              boxShadow: statusTag === "Critical" ? "0 0 12px rgba(239,68,68,0.36)" : "none",
                            }}>
                              {statusTag}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div style={{
                background: "rgba(42,42,42,0.4)",
                backdropFilter: "blur(20px)",
                borderTop: "1px solid rgba(91,64,62,0.15)",
                borderLeft: "1px solid rgba(91,64,62,0.15)",
                borderRadius: 12,
                padding: 18,
                borderRight: `1px solid ${UI.outline}`,
                borderBottom: `1px solid ${UI.outline}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: UI.textMuted }}>
                    Saturation Analysis (7D)
                  </h3>
                  <span className="material-symbols-outlined" style={{ color: UI.primary, fontSize: 16 }}>show_chart</span>
                </div>
                <div style={{ height: 130, display: "flex", alignItems: "flex-end", gap: 6 }}>
                  {saturationBars.map((h, i) => (
                    <div
                      key={`bar-${i}`}
                      style={{
                        flex: 1,
                        borderRadius: "4px 4px 0 0",
                        height: `${Math.max(8, h)}%`,
                        background: h >= 85 ? UI.primaryStrong : h >= 55 ? UI.primary : "rgba(53,53,52,0.6)",
                        opacity: h >= 55 ? 1 : 0.35,
                        boxShadow: h >= 85 ? "0 0 15px rgba(255,84,81,0.4)" : h >= 55 ? "0 0 10px rgba(255,179,173,0.25)" : "none",
                        transition: "opacity 180ms ease",
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 10, textTransform: "uppercase", color: UI.textMuted, opacity: 0.8 }}>
                  <span>Nov 18</span>
                  <span>Nov 20</span>
                  <span>Today</span>
                </div>
              </div>

              <div style={{ display: "grid", gap: 16 }}>
                <div style={metricCardStyle}>
                  <p style={metricLabelStyle}>Total Logs</p>
                  <p style={{ ...metricValueStyle, color: UI.primary }}>{stats.total}</p>
                </div>
                <div style={metricCardStyle}>
                  <p style={metricLabelStyle}>Active Drills</p>
                  <p style={metricValueStyle}>{stats.drills}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes expFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes expGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.06); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 300,
  color: "#e4beba",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  background: "#353534",
  border: "none",
  borderRadius: 4,
  color: "#e5e2e1",
  fontSize: 13,
  padding: "10px 12px",
  fontFamily: "Inter, sans-serif",
};

const smallBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#2a2a2a",
  border: "1px solid rgba(91,64,62,0.12)",
  borderRadius: 4,
  color: "#e4beba",
  padding: "8px 10px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#e4beba",
  fontWeight: 700,
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 12,
  color: "#e5e2e1",
};

const emptyStyle = {
  padding: "20px 16px",
  color: "#e4beba",
  opacity: 0.74,
  fontSize: 12,
};

const metricCardStyle = {
  background: "rgba(42,42,42,0.4)",
  backdropFilter: "blur(20px)",
  borderTop: "1px solid rgba(91,64,62,0.15)",
  borderLeft: "1px solid rgba(91,64,62,0.15)",
  borderRight: "1px solid rgba(91,64,62,0.15)",
  borderBottom: "1px solid rgba(91,64,62,0.15)",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  textAlign: "center",
};

const metricLabelStyle = {
  margin: "0 0 4px",
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  color: "#e4beba",
};

const metricValueStyle = {
  margin: 0,
  fontSize: 38,
  lineHeight: 1,
  fontWeight: 800,
  color: "#e5e2e1",
};
