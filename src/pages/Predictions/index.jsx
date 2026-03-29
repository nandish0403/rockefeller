import { useEffect, useMemo, useState } from "react";
import {
  fetchPredictionsSummary,
  fetchZonePredictionDetail,
  fetchZonePredictions,
} from "../../api/predictions";

const RISK_COLORS = {
  red: "#ff5451",
  orange: "#ffb95f",
  yellow: "#ffeb3b",
  green: "#4edea3",
};

const cardStyle = {
  background: "#1c1b1b",
  border: "1px solid rgba(91,64,62,0.2)",
  borderRadius: 4,
  padding: 16,
};

function Badge({ label, color }) {
  return (
    <span
      style={{
        color,
        border: `1px solid ${color}55`,
        background: `${color}1A`,
        borderRadius: 2,
        padding: "4px 8px",
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

export default function PredictionsPage() {
  const [summary, setSummary] = useState(null);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [zoneDetail, setZoneDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setPageError("");
      try {
        const [summaryResult, zonesResult] = await Promise.allSettled([
          fetchPredictionsSummary(),
          fetchZonePredictions(),
        ]);

        if (!alive) return;

        if (summaryResult.status === "fulfilled") {
          setSummary(summaryResult.value ?? null);
        } else {
          setSummary(null);
          setPageError("Failed to load prediction summary.");
        }

        if (zonesResult.status === "fulfilled") {
          setZones(zonesResult.value?.zones ?? []);
        } else {
          setZones([]);
          setPageError((prev) => {
            if (prev) return `${prev} Zone prediction rows could not be loaded.`;
            return "Zone prediction rows could not be loaded.";
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedZoneId) {
      setZoneDetail(null);
      return;
    }

    let alive = true;
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const data = await fetchZonePredictionDetail(selectedZoneId);
        if (alive) setZoneDetail(data ?? null);
      } catch {
        if (alive) setZoneDetail(null);
      } finally {
        if (alive) setDetailLoading(false);
      }
    };

    loadDetail();
    return () => {
      alive = false;
    };
  }, [selectedZoneId]);

  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => (b.hazard_score || 0) - (a.hazard_score || 0)),
    [zones],
  );

  return (
    <div style={{ padding: "28px 28px 72px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, color: "#e5e2e1", fontSize: 30, fontWeight: 800 }}>Predictions</h2>
        <p style={{ marginTop: 6, color: "#e4beba", opacity: 0.75, fontSize: 12 }}>
          Live risk intelligence with rainfall outlook, blast anomaly context, and model health.
        </p>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 14, marginBottom: 18 }}>
        {[
          {
            label: "Total Zones",
            value: loading ? "..." : summary?.total_zones ?? 0,
            color: "#ffb3ad",
          },
          {
            label: "Critical or High",
            value: loading ? "..." : summary?.critical_or_high ?? 0,
            color: "#ff5451",
          },
          {
            label: "Predictions Today",
            value: loading ? "..." : summary?.predicted_today ?? 0,
            color: "#ffb95f",
          },
          {
            label: "Avg Hazard",
            value: loading ? "..." : `${summary?.avg_hazard_score ?? 0}%`,
            color: "#4edea3",
          },
        ].map((item) => (
          <div key={item.label} style={cardStyle}>
            <div style={{ fontSize: 10, color: "#e4beba", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {item.label}
            </div>
            <div style={{ marginTop: 8, fontSize: 34, color: item.color, fontWeight: 800 }}>{item.value}</div>
          </div>
        ))}
      </section>

      {!!pageError && (
        <div
          style={{
            ...cardStyle,
            marginBottom: 14,
            border: "1px solid rgba(255,84,81,0.35)",
            color: "#ffb3ad",
            fontSize: 12,
          }}
        >
          {pageError}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
        <section style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid rgba(91,64,62,0.2)" }}>
            <div style={{ color: "#e5e2e1", fontSize: 13, fontWeight: 700 }}>Zone Prediction Matrix</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 920 }}>
              <thead>
                <tr style={{ background: "#151414" }}>
                  {[
                    "Zone",
                    "District",
                    "Current",
                    "Predicted",
                    "Hazard",
                    "Rainfall 7D",
                    "Blast",
                    "Model 1",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        color: "#e4beba",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "10px 12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, color: "#e4beba" }}>
                      Loading predictions...
                    </td>
                  </tr>
                ) : sortedZones.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 20, color: "#e4beba" }}>
                      No prediction rows available.
                    </td>
                  </tr>
                ) : (
                  sortedZones.map((row) => {
                    const predColor = RISK_COLORS[row.predicted_risk_level] || "#e5e2e1";
                    const rainTotal = (row.forecast_rainfall_7d_mm || []).reduce((a, b) => a + Number(b || 0), 0);

                    return (
                      <tr
                        key={row.zone_id}
                        onClick={() => setSelectedZoneId(row.zone_id)}
                        style={{
                          borderTop: "1px solid rgba(91,64,62,0.16)",
                          cursor: "pointer",
                          background:
                            selectedZoneId === row.zone_id ? "rgba(255,179,173,0.07)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "12px 12px", color: "#e5e2e1", fontSize: 12 }}>
                          <div style={{ fontWeight: 700 }}>{row.zone_name}</div>
                          <div style={{ color: "#e4beba", opacity: 0.7, fontSize: 11 }}>{row.mine_name}</div>
                        </td>
                        <td style={{ padding: "12px 12px", color: "#e4beba", fontSize: 12 }}>{row.district}</td>
                        <td style={{ padding: "12px 12px" }}>
                          <Badge
                            label={`${String(row.current_risk_level || "unknown").toUpperCase()} (${Math.round((row.current_risk_score || 0) * 100)}%)`}
                            color={RISK_COLORS[row.current_risk_level] || "#e5e2e1"}
                          />
                        </td>
                        <td style={{ padding: "12px 12px" }}>
                          <Badge
                            label={`${String(row.predicted_risk_level || "unknown").toUpperCase()} (${Math.round((row.predicted_risk_score || 0) * 100)}%)`}
                            color={predColor}
                          />
                        </td>
                        <td style={{ padding: "12px 12px", color: "#ffb95f", fontWeight: 700 }}>
                          {Number(row.hazard_score || 0).toFixed(2)}%
                        </td>
                        <td style={{ padding: "12px 12px", color: "#e5e2e1", fontSize: 12 }}>
                          {rainTotal.toFixed(1)} mm
                        </td>
                        <td style={{ padding: "12px 12px", color: row.latest_blast_anomaly ? "#ff5451" : "#4edea3", fontSize: 12 }}>
                          {row.latest_blast_anomaly ? "Anomaly" : "Normal"}
                        </td>
                        <td style={{ padding: "12px 12px", color: "#e5e2e1", fontSize: 12 }}>
                          {row.model1_available ? (
                            "Online"
                          ) : (
                            <span style={{ color: "#ff5451", fontWeight: 700 }}>📷 Crack model offline</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={{ color: "#e5e2e1", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Selected Zone Detail</div>
          {!selectedZoneId ? (
            <p style={{ color: "#e4beba", opacity: 0.75, fontSize: 12 }}>
              Select any row from the matrix to inspect factor breakdown and the 7-day rainfall forecast trace.
            </p>
          ) : detailLoading ? (
            <p style={{ color: "#e4beba", opacity: 0.75, fontSize: 12 }}>Loading zone detail...</p>
          ) : !zoneDetail ? (
            <p style={{ color: "#e4beba", opacity: 0.75, fontSize: 12 }}>No detail found for this zone.</p>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 18, color: "#e5e2e1", fontWeight: 800 }}>{zoneDetail.zone_name}</div>
                <div style={{ fontSize: 11, color: "#e4beba", opacity: 0.7 }}>
                  {zoneDetail.district} • Updated: {zoneDetail.predicted_at || "-"}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "#141313", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontSize: 10, color: "#e4beba", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Predicted Risk
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Badge
                      label={`${String(zoneDetail.predicted_risk_level || "unknown").toUpperCase()} (${Math.round((zoneDetail.predicted_risk_score || 0) * 100)}%)`}
                      color={RISK_COLORS[zoneDetail.predicted_risk_level] || "#e5e2e1"}
                    />
                  </div>
                </div>
                <div style={{ background: "#141313", borderRadius: 4, padding: 10 }}>
                  <div style={{ fontSize: 10, color: "#e4beba", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Hazard Score
                  </div>
                  <div style={{ marginTop: 6, fontSize: 20, color: "#ffb95f", fontWeight: 800 }}>
                    {Number(zoneDetail.hazard_score || 0).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "#e5e2e1", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Top Contributing Factors</div>
                {(zoneDetail.factor_breakdown || []).length === 0 ? (
                  <div style={{ color: "#e4beba", opacity: 0.7, fontSize: 12 }}>No factor data available.</div>
                ) : (
                  (zoneDetail.factor_breakdown || []).map((factor) => (
                    <div
                      key={factor.key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        color: "#e5e2e1",
                        padding: "8px 0",
                        borderTop: "1px solid rgba(91,64,62,0.14)",
                      }}
                    >
                      <span>{factor.label}</span>
                      <span style={{ color: "#e4beba" }}>
                        value: {factor.value} | impact: {factor.impact}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div>
                <div style={{ color: "#e5e2e1", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  Rainfall Forecast (7D)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(zoneDetail.forecast_rainfall_7d_mm || []).map((val, idx) => (
                    <span
                      key={`${zoneDetail.zone_id}-${idx}`}
                      style={{
                        fontSize: 11,
                        color: "#e5e2e1",
                        background: "#141313",
                        border: "1px solid rgba(91,64,62,0.25)",
                        borderRadius: 2,
                        padding: "5px 8px",
                      }}
                    >
                      D{idx + 1}: {Number(val || 0).toFixed(1)}mm
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
