import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Grid, CircularProgress,
} from "@mui/material";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, ResponsiveContainer,
  Tooltip as RechartTooltip,
} from "recharts";
import { MapContainer, TileLayer, Polygon, Tooltip } from "react-leaflet";

import { useDashboardData } from "./useDashboardData";
import { useAuth } from "../../context/AuthContext";
import { acknowledgeAlert, resolveAlert } from "../../api/alerts";
import { formatTimeAgo } from "../../utils/formatUtils";
import { T } from "../../theme/tokens";

// ── Design helpers ─────────────────────────────────────────────
const glass = {
  background: T.glass.background,
  backdropFilter: T.glass.backdropFilter,
  border: T.glass.border,
  borderRadius: "4px",
};

const RISK_COLORS = {
  red:    T.primaryCont,
  orange: T.secondary,
  yellow: "#ffeb3b",
  green:  T.tertiary,
};

const ACTIVITY_ICONS = {
  alert:  { icon: "priority_high",       color: T.tertiary },
  blast:  { icon: "explosion",           color: T.secondary },
  crack:  { icon: "running_with_errors", color: T.primaryCont },
  report: { icon: "description",         color: T.primary },
  zone:   { icon: "swap_vert",           color: T.primary },
};

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, accent, pulse, icon, trend }) {
  return (
    <Box sx={{
      ...glass, p: 3, position: "relative", overflow: "hidden",
      cursor: "default",
      transition: "background 0.2s",
      "&:hover": { bgcolor: T.surfaceHigh },
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", mb: 1 }}>
        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 300,
          letterSpacing: "0.1em", color: T.onSurfaceVar }}>
          {label}
        </Typography>
        {pulse ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: "50%",
              bgcolor: accent, animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%,100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: accent }}>
              HIGH RISK
            </Typography>
          </Box>
        ) : trend ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <span className="material-symbols-outlined"
              style={{ color: T.tertiary, fontSize: 16 }}>trending_up</span>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.tertiary }}>
              {trend}
            </Typography>
          </Box>
        ) : (
          <span className="material-symbols-outlined"
            style={{ color: accent || T.tertiary, fontSize: 18 }}>{icon}</span>
        )}
      </Box>

      <Typography sx={{ fontSize: "2.75rem", fontWeight: 700,
        color: accent || T.onSurface, lineHeight: 1 }}>
        {value ?? "—"}
      </Typography>

      {sub && (
        <Typography sx={{ fontSize: 10, color: T.onSurfaceVar,
          mt: 1, fontWeight: 300 }}>
          {sub}
        </Typography>
      )}

      {/* Bottom gradient bar */}
      <Box sx={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${accent || T.primary}33, transparent)`,
      }} />
    </Box>
  );
}

// ── Alert Card ────────────────────────────────────────────────
function AlertCard({ alert, canAct, onAck, onResolve }) {
  const color = RISK_COLORS[alert.risk_level] || T.primary;
  return (
    <Box sx={{
      p: 2, bgcolor: T.surfaceCont, borderRadius: "2px",
      borderLeft: `2px solid ${color}`,
      transition: "all 0.2s",
      "&:hover": { bgcolor: T.surfaceHigh },
    }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>
          {alert.zone_name}
        </Typography>
        <Typography sx={{ fontSize: 10, color: T.onSurfaceVar, fontWeight: 300 }}>
          {formatTimeAgo(alert.created_at)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{
          bgcolor: `${color}18`, color, fontSize: 9, fontWeight: 700,
          px: 1, py: 0.3, borderRadius: "2px",
        }}>
          {alert.risk_level?.toUpperCase()}
        </Box>
        <Typography sx={{ fontSize: 11, color: T.onSurfaceVar }}>
          {(alert.trigger_reason || "").slice(0, 40)}
        </Typography>
      </Box>
      {canAct && alert.status === "active" && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box onClick={() => onAck(alert.id)} sx={{
            flex: 1, bgcolor: T.primary, color: "#68000a",
            fontSize: 10, fontWeight: 700, py: 0.8, borderRadius: "2px",
            textAlign: "center", cursor: "pointer",
            "&:hover": { opacity: 0.9 }, transition: "opacity 0.2s",
          }}>
            ACKNOWLEDGE
          </Box>
          <Box onClick={() => onResolve(alert.id)} sx={{
            flex: 1, border: `1px solid ${T.outlineVar}`,
            color: T.onSurface, fontSize: 10, fontWeight: 700,
            py: 0.8, borderRadius: "2px", textAlign: "center",
            cursor: "pointer",
            "&:hover": { bgcolor: T.surfaceBright }, transition: "background 0.2s",
          }}>
            RESOLVE
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Donut Chart ───────────────────────────────────────────────
function DonutChart({ distribution }) {
  const data = [
    { name: "Critical", value: distribution.red    || 0, color: T.primaryCont },
    { name: "High",     value: distribution.orange || 0, color: T.secondary },
    { name: "Elevated", value: distribution.yellow || 0, color: "#ffeb3b" },
    { name: "Stable",   value: distribution.green  || 0, color: T.tertiary },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center",
      justifyContent: "center", position: "relative" }}>
      <Box sx={{ position: "relative", width: 160, height: 160 }}>
        <PieChart width={160} height={160}>
          <Pie data={data} cx={75} cy={75} innerRadius={52} outerRadius={72}
            paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
        </PieChart>
        {/* Center label */}
        <Box sx={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: T.onSurface }}>
            {total}
          </Typography>
          <Typography sx={{ fontSize: 9, color: T.onSurfaceVar,
            textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Total
          </Typography>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ ml: 3, display: "flex", flexDirection: "column", gap: 1 }}>
        {data.map(d => (
          <Box key={d.name} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: d.color }} />
            <Typography sx={{ fontSize: 10, color: T.onSurfaceVar }}>
              {d.name} ({total ? ((d.value / total) * 100).toFixed(1) : 0}%)
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ── Bar Chart ─────────────────────────────────────────────────
function TrendChart({ data }) {
  return (
    <Box sx={{ flex: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%">
          <XAxis dataKey="day" tick={{ fill: T.onSurfaceVar, fontSize: 9,
            fontFamily: "Inter", textTransform: "uppercase" }}
            axisLine={false} tickLine={false} />
          <RechartTooltip
            contentStyle={{ background: T.surfaceLow, border: `1px solid ${T.outlineVar}`,
              borderRadius: 4, fontSize: 11, color: T.onSurface }}
            cursor={{ fill: `${T.primary}10` }}
          />
          <Bar dataKey="red"    fill={T.primaryCont} radius={[2,2,0,0]} />
          <Bar dataKey="orange" fill={T.secondary}   radius={[2,2,0,0]} />
          <Bar dataKey="yellow" fill="#ffeb3b"        radius={[2,2,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

// ── Activity Item ─────────────────────────────────────────────
function ActivityItem({ item, isLast }) {
  const config = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.alert;
  return (
    <Box sx={{ display: "flex", gap: 3, position: "relative" }}>
      {!isLast && (
        <Box sx={{
          position: "absolute", left: 15, top: 32, bottom: -24,
          width: 1, bgcolor: `${T.outlineVar}20`,
        }} />
      )}
      <Box sx={{
        zIndex: 1, width: 32, height: 32, borderRadius: "50%",
        bgcolor: T.surfaceBright,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid rgba(91,64,62,0.2)`,
        flexShrink: 0,
      }}>
        <span className="material-symbols-outlined"
          style={{ color: config.color, fontSize: 16 }}>{config.icon}</span>
      </Box>
      <Box sx={{ flex: 1, display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", pb: isLast ? 0 : 3 }}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.onSurface }}>
            {item.title}
          </Typography>
          <Typography sx={{ fontSize: 11, color: T.onSurfaceVar }}>
            {item.subtitle}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0, ml: 2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.onSurface }}>
            {item.user || "System"}
          </Typography>
          <Typography sx={{ fontSize: 10, color: T.onSurfaceVar }}>
            {formatTimeAgo(item.time)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const navigate     = useNavigate();
  const { currentUser } = useAuth();
  const canAct = ["admin", "safety_officer"].includes(currentUser?.role);

  const {
    kpis, recentAlerts, distribution, trendData,
    activityFeed, rainfallSummary, zones, loading,
  } = useDashboardData();

  const handleAck     = async (id) => { await acknowledgeAlert(id); };
  const handleResolve = async (id) => { await resolveAlert(id); };

  // Maharashtra center
  const CENTER = [19.7515, 75.7139];

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", pt: 20 }}>
      <CircularProgress sx={{ color: T.primary }} />
    </Box>
    
  );

  return (
    <Box>

      {/* ── Row 1: KPI Cards ─────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <KpiCard
            label="Total Monitored Zones"
            value={kpis.totalZones?.toLocaleString()}
            trend="+2%"
            accent={T.tertiary}
            icon="trending_up"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            label="Critical Zones (Red)"
            value={kpis.criticalZones}
            accent={T.primaryCont}
            pulse
            sub="Immediate Action Required"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            label="Active Alerts"
            value={kpis.activeAlerts}
            accent={T.secondary}
            icon="radio_button_checked"
            sub={`Elevated monitoring in ${Math.ceil((kpis.activeAlerts||0)/8)} sectors`}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KpiCard
            label="Reports Today"
            value={kpis.reportsToday || 0}
            accent={T.tertiary}
            icon="check_circle"
            sub="Field worker submissions"
          />
        </Grid>
      </Grid>

      {/* ── Row 2: Map + Alerts Feed ─────────────────── */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Map */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ ...glass, overflow: "hidden", height: 500,
            display: "flex", flexDirection: "column" }}>
            {/* Map header */}
            <Box sx={{
              px: 3, py: 2, bgcolor: T.surfaceLow,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <span className="material-symbols-outlined"
                  style={{ color: T.primary, fontSize: 18 }}>distance</span>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.onSurface,
                  letterSpacing: "-0.02em" }}>
                  Maharashtra Risk Distribution
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["All Districts", "Konkan", "Vidarbha"].map((label, i) => (
                  <Box key={label} sx={{
                    bgcolor: i === 0 ? T.surfaceBright : T.surfaceHigh,
                    fontSize: 10, px: 1.5, py: 0.5, borderRadius: "2px",
                    color: i === 0 ? T.onSurface : T.onSurfaceVar,
                    cursor: "pointer", fontWeight: 600,
                    "&:hover": { bgcolor: T.primary, color: "#68000a" },
                    transition: "all 0.2s",
                  }}>
                    {label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Leaflet Map */}
            <Box sx={{ flex: 1, position: "relative" }}>
              <MapContainer center={CENTER} zoom={6}
                style={{ height: "100%", width: "100%", background: T.surfaceLowest }}
                zoomControl={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; CartoDB'
                />
                {zones.map(zone => zone.latlngs?.length > 0 && (
                  <Polygon
                    key={zone.id}
                    positions={zone.latlngs}
                    pathOptions={{
                      fillColor: RISK_COLORS[zone.risk_level] || T.tertiary,
                      fillOpacity: 0.4,
                      color: RISK_COLORS[zone.risk_level] || T.tertiary,
                      weight: 1.5,
                    }}
                    eventHandlers={{ click: () => navigate(`/zones/${zone.id}`) }}
                  >
                    <Tooltip sticky>
                      <Box sx={{ fontSize: 11, color: T.onSurface }}>
                        {zone.name} — {zone.risk_level?.toUpperCase()}
                      </Box>
                    </Tooltip>
                  </Polygon>
                ))}
              </MapContainer>

              {/* Map Legend */}
              <Box sx={{
                position: "absolute", bottom: 24, left: 24, zIndex: 1000,
                p: 2, bgcolor: "rgba(14,14,14,0.85)",
                backdropFilter: "blur(8px)",
                borderRadius: "4px",
                border: `1px solid rgba(91,64,62,0.15)`,
                display: "flex", flexDirection: "column", gap: 1.5,
              }}>
                {[
                  ["Critical (>85%)", T.primaryCont],
                  ["High (60-85%)",   T.secondary],
                  ["Stable (<30%)",   T.tertiary],
                ].map(([label, color]) => (
                  <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "2px", bgcolor: color }} />
                    <Typography sx={{ fontSize: 10, color: T.onSurface }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Active Alerts Feed */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ ...glass, height: 500, display: "flex", flexDirection: "column" }}>
            <Box sx={{
              px: 3, py: 2, bgcolor: T.surfaceLow,
              borderBottom: `1px solid rgba(91,64,62,0.15)`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.onSurface,
                letterSpacing: "-0.02em" }}>
                Active Alerts Feed
              </Typography>
              <Box sx={{
                bgcolor: `${T.primaryCont}18`, color: T.primaryCont,
                fontSize: 10, fontWeight: 700, px: 1.5, py: 0.3, borderRadius: "2px",
              }}>
                {kpis.activeAlerts} ACTIVE
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex",
              flexDirection: "column", gap: 2,
              "&::-webkit-scrollbar": { width: 4 },
              "&::-webkit-scrollbar-track": { bgcolor: T.surfaceLowest },
              "&::-webkit-scrollbar-thumb": { bgcolor: T.surfaceBright, borderRadius: 10 },
            }}>
              {recentAlerts.length === 0 ? (
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", py: 8 }}>
                  <span className="material-symbols-outlined"
                    style={{ color: T.tertiary, fontSize: 48 }}>check_circle</span>
                  <Typography sx={{ color: T.tertiary, fontWeight: 700,
                    mt: 2, fontSize: 14 }}>All Clear</Typography>
                  <Typography sx={{ color: T.onSurfaceVar, fontSize: 11, mt: 0.5 }}>
                    No active alerts
                  </Typography>
                </Box>
              ) : recentAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert}
                  canAct={canAct}
                  onAck={handleAck}
                  onResolve={handleResolve} />
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* ── Row 3: Charts ────────────────────────────── */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        {/* Donut */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ ...glass, p: 3, height: 320,
            display: "flex", flexDirection: "column" }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.onSurface,
              letterSpacing: "-0.02em", mb: 3 }}>
              Zone Risk Distribution
            </Typography>
            <DonutChart distribution={distribution || {}} />
          </Box>
        </Grid>

        {/* Bar Chart */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ ...glass, p: 3, height: 320,
            display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", mb: 3 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.onSurface,
                letterSpacing: "-0.02em" }}>
                7-Day Risk Trend
              </Typography>
              <Box sx={{ display: "flex", gap: 3 }}>
                {[["Critical", T.primaryCont], ["High", T.secondary], ["Elevated", "#ffeb3b"]]
                  .map(([label, color]) => (
                  <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 12, height: 2, bgcolor: color }} />
                    <Typography sx={{ fontSize: 9, color: T.onSurfaceVar,
                      textTransform: "uppercase" }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <TrendChart data={trendData || []} />
          </Box>
        </Grid>

        {/* Rainfall Widget */}
        <Grid item xs={12} lg={3}>
          <Box sx={{
            ...glass, p: 3, height: 320,
            display: "flex", flexDirection: "column",
            background: `linear-gradient(135deg, ${T.surfaceHigh}, ${T.surfaceCont})`,
          }}>
            <Typography sx={{ fontSize: 10, color: T.onSurfaceVar,
              textTransform: "uppercase", letterSpacing: "0.15em",
              fontWeight: 700, mb: 2 }}>
              Met Forecast Focus
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: 28, fontWeight: 700, color: T.onSurface }}>
                {rainfallSummary?.district || "—"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.onSurfaceVar }}>
                District Peak Intensity
              </Typography>
            </Box>

            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              {[
                ["Rainfall (24h)", `${rainfallSummary?.rainfallLast24h ?? 0}mm`, T.primary],
                ["7-Day Total",    `${rainfallSummary?.rainfallLast7d ?? 0}mm`,  T.onSurface],
                ["Trend",          rainfallSummary?.trend || "stable",
                  rainfallSummary?.trend === "increasing" ? T.primaryCont : T.tertiary],
                ["Warning Level",  rainfallSummary?.warningLevel || "none",
                  rainfallSummary?.warningLevel === "extreme" ? T.primaryCont : T.secondary],
              ].map(([label, val, color]) => (
                <Box key={label} sx={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-end",
                  borderBottom: `1px solid rgba(91,64,62,0.15)`, pb: 1,
                }}>
                  <Typography sx={{ fontSize: 11, color: T.onSurfaceVar }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: label === "Rainfall (24h)" ? 18 : 11,
                    fontWeight: 700, color, textTransform: "capitalize" }}>
                    {val}
                  </Typography>
                </Box>
              ))}
            </Box>

            {rainfallSummary?.warningLevel &&
             rainfallSummary.warningLevel !== "none" && (
              <Box sx={{
                mt: 2, p: 1.5, borderRadius: "2px",
                bgcolor: `${T.primaryCont}18`,
                display: "flex", alignItems: "center", gap: 1.5,
              }}>
                <span className="material-symbols-outlined"
                  style={{ color: T.primaryCont, fontSize: 20 }}>thunderstorm</span>
                <Typography sx={{ fontSize: 10, color: T.primaryCont, lineHeight: 1.4 }}>
                  {rainfallSummary.warningLevel === "extreme"
                    ? "Extreme rainfall warning active."
                    : "Heavy rainfall warning issued."}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* ── Row 4: Activity Timeline ─────────────────── */}
      <Box sx={{ ...glass, p: 3 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.onSurface,
          letterSpacing: "-0.02em", mb: 3 }}>
          Recent Activity Timeline
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {(activityFeed || []).length === 0 ? (
            <Typography sx={{ color: T.onSurfaceVar, fontSize: 12,
              textAlign: "center", py: 4 }}>
              No recent activity
            </Typography>
          ) : (activityFeed || []).slice(0, 6).map((item, i, arr) => (
            <ActivityItem key={i} item={item}
              isLast={i === arr.length - 1} />
          ))}
        </Box>
      </Box>

    </Box>
  );
}
