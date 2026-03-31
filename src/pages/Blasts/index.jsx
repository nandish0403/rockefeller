import { useEffect, useMemo, useState } from "react";
import { createBlast, fetchBlasts } from "../../api/blasts";
import { fetchZones } from "../../api/zones";

const EMPTY_FORM = {
  zone_id: "",
  blast_date: "",
  blast_time: "",
  intensity: "7.2",
  depth_m: "",
  blasts_per_week: "",
  charge_weight_kg: "",
  detonator_type: "Electronic (Precision)",
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

function toDatetimeLocal(dateStr, timeStr) {
  if (!dateStr) return "";
  const time = timeStr || "00:00";
  return `${dateStr}T${time}`;
}

function fromDatetimeLocal(value) {
  if (!value) return { blast_date: "", blast_time: "" };
  const [d, t] = value.split("T");
  return { blast_date: d || "", blast_time: (t || "").slice(0, 5) };
}

export default function BlastsPage() {
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
    const now = Date.now();
    const blasts24h = rows.filter((r) => {
      if (!r?.blast_date) return false;
      return now - new Date(r.blast_date).getTime() <= 24 * 60 * 60 * 1000;
    }).length;
    const anomalies = rows.filter((r) => r?.is_anomaly).length;
    return { blasts24h, anomalies };
  }, [rows]);

  const load = async (zoneId) => {
    setLoading(true);
    try {
      const [zoneList, blastRows] = await Promise.all([
        zones.length ? Promise.resolve(zones) : fetchZones().catch(() => []),
        fetchBlasts({ zone_id: zoneId || undefined, limit: 50 }).catch(() => []),
      ]);
      if (!zones.length) setZones(zoneList || []);
      setRows(blastRows || []);
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

  const onDateTimeChange = (value) => {
    const parsed = fromDatetimeLocal(value);
    setForm((prev) => ({ ...prev, ...parsed }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setInlineStatus("");

    try {
      const payload = {
        zone_id: form.zone_id,
        blast_date: form.blast_date,
        blast_time: form.blast_time,
        intensity: Number(form.intensity),
        depth_m: Number(form.depth_m),
        blasts_per_week: Number(form.blasts_per_week),
        charge_weight_kg: form.charge_weight_kg === "" ? null : Number(form.charge_weight_kg),
        detonator_type: form.detonator_type || null,
        remarks: form.remarks || null,
      };

      const res = await createBlast(payload);
      await load(form.zone_id);

      if (res?.is_anomaly) {
        setInlineStatus(`Success: Blast logged. ML anomaly detection triggered in ${res?.zone_name || "selected zone"}.`);
      } else {
        setInlineStatus("Blast logged successfully. No anomaly detected for this event.");
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to submit blast event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 64px)", display: "flex", flexDirection: "column", color: UI.text }}>
      <section style={{ padding: "8px 0 0" }}>
        {!!inlineStatus && (
          <div style={{
            background: "rgba(147,0,10,0.18)",
            borderLeft: "4px solid #ffb4ab",
            borderRadius: "0 8px 8px 0",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            backdropFilter: "blur(14px)",
            animation: "blastFade 380ms ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ color: "#ffb4ab", fontVariationSettings: "'FILL' 1", fontSize: 20 }}>report</span>
              <p style={{ margin: 0, fontSize: 13, color: "#ffdad6", fontWeight: 500 }}>{inlineStatus}</p>
            </div>
            <button
              onClick={() => setInlineStatus("")}
              style={{ background: "transparent", border: "none", color: "rgba(255,218,214,0.6)", cursor: "pointer" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </button>
          </div>
        )}
      </section>

      <div style={{ display: "flex", flex: 1, gap: 20, paddingTop: 16, overflow: "hidden" }}>
        <section style={{ width: 420, minWidth: 420, display: "flex", flexDirection: "column", animation: "blastFade 420ms ease both" }}>
          <div style={{
            background: UI.surface,
            border: `1px solid ${UI.outline}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}>
            <div style={{ padding: 24, borderBottom: `1px solid ${UI.outline}`, background: "rgba(42,42,42,0.32)" }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: UI.text }}>New Blast Entry</h3>
              <p style={{ margin: "4px 0 0", fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: UI.textMuted, opacity: 0.75 }}>
                Secure Logging Interface
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: 24, display: "grid", gap: 16 }}>
              {error ? (
                <div style={{ background: "rgba(255,84,81,0.14)", border: "1px solid rgba(255,84,81,0.34)", color: "#ffb4ab", borderRadius: 8, padding: "10px 12px", fontSize: 12 }}>
                  {error}
                </div>
              ) : null}

              <div>
                <label style={labelStyle}>Target Zone</label>
                <select
                  value={form.zone_id}
                  onChange={(e) => set("zone_id", e.target.value)}
                  required
                  style={inputStyle}
                >
                  <option value="">Select zone</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} ({z.district})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Date / Time</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocal(form.blast_date, form.blast_time)}
                    onChange={(e) => onDateTimeChange(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Depth (m)</label>
                  <input type="number" step="0.01" min="0" value={form.depth_m} onChange={(e) => set("depth_m", e.target.value)} required style={inputStyle} />
                </div>
              </div>

              <div style={{ background: UI.surfaceLow, border: `1px solid rgba(91,64,62,0.1)`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Intensity Level</label>
                  <span style={{ fontSize: 15, color: UI.primary, fontWeight: 700 }}>{Number(form.intensity || 0).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.1"
                  value={form.intensity}
                  onChange={(e) => set("intensity", e.target.value)}
                  style={{ width: "100%", accentColor: UI.primaryStrong, cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Blasts / Week</label>
                  <input type="number" min="0" value={form.blasts_per_week} onChange={(e) => set("blasts_per_week", e.target.value)} required style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Charge Weight (kg)</label>
                  <input type="number" step="0.01" min="0" value={form.charge_weight_kg} onChange={(e) => set("charge_weight_kg", e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Detonator Type</label>
                <select value={form.detonator_type} onChange={(e) => set("detonator_type", e.target.value)} style={inputStyle}>
                  <option>Electronic (Precision)</option>
                  <option>Electric</option>
                  <option>Non-Electric</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Remarks and Notes</label>
                <textarea
                  rows={3}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  placeholder="Enter seismic observations..."
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  marginTop: 2,
                  width: "100%",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 11,
                  color: "#68000a",
                  cursor: "pointer",
                  background: "linear-gradient(135deg,#ffb3ad,#ff5451)",
                  boxShadow: "0 8px 22px rgba(255,84,81,0.22)",
                  transition: "transform 180ms ease, filter 180ms ease",
                  animation: "blastGlow 2.8s ease-in-out infinite",
                }}
              >
                {submitting ? "Submitting..." : "Log Blast Event"}
              </button>
            </form>
          </div>
        </section>

        <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", animation: "blastFade 460ms ease both" }}>
          <div style={{
            background: UI.surface,
            border: `1px solid ${UI.outline}`,
            borderRadius: 12,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{ padding: 24, borderBottom: `1px solid ${UI.outline}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: UI.text }}>
                  Recent Blasts {selectedZone ? `- ${selectedZone.name}` : ""}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 11, letterSpacing: "0.09em", textTransform: "uppercase", color: UI.textMuted, opacity: 0.75 }}>
                  Real-time Monitoring Stream
                </p>
              </div>
              <button onClick={() => load(form.zone_id)} style={refreshBtnStyle}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                Refresh
              </button>
            </div>

            <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
              <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(42,42,42,0.65)" }}>
                  <tr>
                    {[
                      "Zone",
                      "Date",
                      "Intensity",
                      "Depth",
                      "ML Anomaly Status",
                      "Severity",
                      "Risk Score",
                    ].map((head) => (
                      <th key={head} style={thStyle}>{head}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={emptyStyle}>Loading blast events...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={7} style={emptyStyle}>No blast events found.</td></tr>
                  ) : (
                    rows.map((row, idx) => {
                      const isAnomaly = !!row.is_anomaly;
                      const score = Number(row.anomaly_score || 0);
                      const severity = row.severity || "low";
                      const bandColor = severity === "critical" ? "#ff5451" : severity === "warning" ? "#ffb95f" : "#4edea3";

                      return (
                        <tr key={row.id} style={{
                          borderTop: "1px solid rgba(91,64,62,0.08)",
                          background: idx % 2 === 0 ? "rgba(28,27,27,0.22)" : "transparent",
                          transition: "background 180ms ease",
                        }}>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ width: 5, height: 24, borderRadius: 999, background: isAnomaly ? UI.primaryStrong : UI.tertiary }} />
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{row.zone_name || "-"}</p>
                                <p style={{ margin: "2px 0 0", fontSize: 10, color: UI.textMuted }}>Monitoring node</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: "monospace", color: UI.textMuted }}>
                            {row.blast_date ? new Date(row.blast_date).toLocaleString() : "-"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{row.intensity ?? "-"}</td>
                          <td style={{ ...tdStyle, textAlign: "center", color: UI.textMuted }}>{row.depth_m ?? "-"}m</td>
                          <td style={tdStyle}>
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 9px",
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: isAnomaly ? "#ffb4ab" : UI.tertiary,
                              background: isAnomaly ? "rgba(255,84,81,0.1)" : "rgba(78,222,163,0.1)",
                              border: isAnomaly ? "1px solid rgba(255,84,81,0.28)" : "1px solid rgba(78,222,163,0.24)",
                              boxShadow: isAnomaly ? "0 0 8px rgba(255,179,173,0.12)" : "none",
                            }}>
                              {isAnomaly ? <span style={{ width: 6, height: 6, borderRadius: 999, background: "#ff5451", animation: "dotPulse 1.6s ease-in-out infinite" }} /> : null}
                              {isAnomaly ? "Anomaly" : "Normal"}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: 3,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: "uppercase",
                              background: `${bandColor}22`,
                              color: bandColor,
                            }}>
                              {severity}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: isAnomaly ? "#ffb4ab" : UI.text }}>{score ? score.toFixed(2) : "-"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ padding: "12px 16px", borderTop: `1px solid ${UI.outline}`, background: "rgba(28,27,27,0.26)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 20 }}>
                <div>
                  <p style={statLabelStyle}>Total Blasts (24h)</p>
                  <p style={statValueStyle}>{stats.blasts24h}</p>
                </div>
                <div>
                  <p style={statLabelStyle}>Anomalies Detected</p>
                  <p style={{ ...statValueStyle, color: "#ffb4ab" }}>{stats.anomalies}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: UI.textMuted }}>
                <span>Page 1 of 1</span>
                <button style={pageBtnStyle}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_left</span></button>
                <button style={pageBtnStyle}><span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span></button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes blastFade {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes blastGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.06); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.18); }
        }
      `}</style>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 300,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#e4beba",
  marginBottom: 6,
};

const inputStyle = {
  width: "100%",
  background: "#1c1b1b",
  border: "none",
  color: "#e5e2e1",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
};

const refreshBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  border: "1px solid rgba(91,64,62,0.18)",
  background: "#2a2a2a",
  color: "#e4beba",
  borderRadius: 6,
  padding: "8px 12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  fontWeight: 300,
  color: "#e4beba",
};

const tdStyle = {
  padding: "14px 16px",
  fontSize: 12,
  color: "#e5e2e1",
};

const emptyStyle = {
  padding: "24px 16px",
  fontSize: 12,
  color: "#e4beba",
  opacity: 0.75,
};

const statLabelStyle = {
  margin: 0,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  color: "#e4beba",
  opacity: 0.7,
};

const statValueStyle = {
  margin: "4px 0 0",
  fontSize: 22,
  lineHeight: 1,
  color: "#e5e2e1",
  fontWeight: 800,
};

const pageBtnStyle = {
  width: 24,
  height: 24,
  borderRadius: 4,
  background: "transparent",
  border: "1px solid rgba(91,64,62,0.16)",
  color: "#e4beba",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
