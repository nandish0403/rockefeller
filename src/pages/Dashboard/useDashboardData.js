import { useState, useEffect, useMemo } from "react";
import { fetchZones } from "../../api/zones";
import { fetchAlerts } from "../../api/alerts";
import { fetchWeather } from "../../api/weather";

export function useDashboardData() {
  const [zones,   setZones]   = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [weather, setWeather] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchZones(),
      fetchAlerts({ status: "active" }),
      fetchWeather().catch(() => []),   // weather API may not exist yet — fail silently
    ])
      .then(([z, a, w]) => {
        setZones(z   ?? []);
        setAlerts(a  ?? []);
        setWeather(w ?? []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ✅ KPIs — matches KpiRow expectations
  const kpis = useMemo(() => ({
    totalZones:    zones.length,
    criticalZones: zones.filter(z => z.risk_level === "red").length,    // KpiRow uses criticalZones
    activeAlerts:  alerts.length,
    reportsToday:  0,   // will be real once reports API is wired
  }), [zones, alerts]);

  // ✅ Distribution — matches ZoneDistributionChart { green, yellow, orange, red } shape
  const distribution = useMemo(() => ({
    green:  zones.filter(z => z.risk_level === "green").length,
    yellow: zones.filter(z => z.risk_level === "yellow").length,
    orange: zones.filter(z => z.risk_level === "orange").length,
    red:    zones.filter(z => z.risk_level === "red").length,
  }), [zones]);

  // ✅ Activity feed — maps alerts to { type, title, subtitle, time } shape ActivityFeed expects
  const activityFeed = useMemo(() =>
    alerts.slice(0, 8).map(a => ({
      type:     "alert",
      title:    a.zone_name   ?? "Unknown Zone",
      subtitle: a.trigger_reason ?? "Risk alert triggered",
      time:     a.created_at  ?? null,
    })),
  [alerts]);

  // ✅ Rainfall summary — maps Atlas weather record to RainfallWidget shape
  const rainfallSummary = useMemo(() => {
    if (!weather.length) return null;
    const top = weather.reduce((max, w) =>
      (w.rainfall_mm > (max?.rainfall_mm || 0) ? w : max), null
    );
    if (!top) return null;
    return {
      district:       top.district,
      warningLevel:   top.warning_level,    // snake_case → camelCase for component
      rainfallLast24h: top.rainfall_mm,
      rainfallLast7d:  top.rainfall_7d ?? top.rainfall_mm,
      trend:           top.trend ?? "stable",
    };
  }, [weather]);

  // ✅ Trend data — placeholder until historical data API exists
  const trendData = useMemo(() => {
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    return days.map(day => ({
      day,
      red:    Math.floor(Math.random() * kpis.criticalZones + 1),
      orange: Math.floor(Math.random() * 4),
      yellow: Math.floor(Math.random() * 3),
    }));
  }, [kpis.criticalZones]);

  // Recent alerts for the alerts list on dashboard
  const recentAlerts = useMemo(() => alerts.slice(0, 5), [alerts]);

  return {
    zones, alerts, weather,
    kpis, distribution, activityFeed,
    rainfallSummary, trendData, recentAlerts,
    loading, error,
  };
}
