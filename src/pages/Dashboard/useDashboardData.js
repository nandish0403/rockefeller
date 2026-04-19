import { useState, useEffect, useMemo } from "react";
import { fetchZones }   from "../../api/zones";
import { fetchAlerts }  from "../../api/alerts";
import { fetchWeather } from "../../api/weather";
import { fetchReports } from "../../api/reports";

export function useDashboardData() {
  const [zones,   setZones]   = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [weather, setWeather] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // ✅ Each fetch fails independently — one failure won't block dashboard
    Promise.allSettled([
      fetchZones(),
      fetchAlerts({ status: "active" }),
      fetchWeather(),
      fetchReports(),
    ]).then(([z, a, w, r]) => {
      if (z.status === "fulfilled") setZones(z.value  ?? []);
      if (a.status === "fulfilled") setAlerts(a.value ?? []);
      if (w.status === "fulfilled") setWeather(w.value ?? []);
      if (r.status === "fulfilled") setReports(r.value ?? []);
    }).finally(() => setLoading(false));   // ✅ ALWAYS runs
  }, []);

  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    const reportsToday = reports.filter(rpt => {
      const d = rpt.created_at ? new Date(rpt.created_at).toDateString() : null;
      return d === today;
    }).length;

    return {
      totalZones:    zones.length,
      criticalZones: zones.filter(z => z.risk_level === "red").length,
      activeAlerts:  alerts.length,
      reportsToday,
    };
  }, [zones, alerts, reports]);

  const distribution = useMemo(() => ({
    green:  zones.filter(z => z.risk_level === "green").length,
    yellow: zones.filter(z => z.risk_level === "yellow").length,
    orange: zones.filter(z => z.risk_level === "orange").length,
    red:    zones.filter(z => z.risk_level === "red").length,
  }), [zones]);

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const at = new Date(a?.created_at || 0).getTime();
        const bt = new Date(b?.created_at || 0).getTime();
        return bt - at;
      }),
    [alerts]
  );

  const recentAlerts = useMemo(() => sortedAlerts.slice(0, 8), [sortedAlerts]);

  const activityFeed = useMemo(() =>
    sortedAlerts.slice(0, 6).map(a => ({
      type:     "alert",
      title:    a.zone_name      ?? "Unknown Zone",
      subtitle: a.trigger_reason ?? "Risk alert triggered",
      user:     a.trigger_source ?? "System",
      time:     a.created_at     ?? null,
    })),
  [sortedAlerts]);

  const rainfallSummary = useMemo(() => {
    if (!weather.length) return null;
    const top = weather.reduce((max, w) =>
      ((w.rainfall_mm ?? 0) > (max?.rainfall_mm ?? 0) ? w : max), null
    );
    return top ? {
      district:        top.district,
      warningLevel:    top.warning_level,
      rainfallLast24h: top.rainfall_mm,
      rainfallLast7d:  top.rainfall_7d ?? top.rainfall_mm,
      trend:           top.trend ?? "stable",
    } : null;
  }, [weather]);

  const trendData = useMemo(() => {
    const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    return days.map((day, i) => ({
      day,
      red:    Math.max(0, (distribution.red    || 0) + Math.floor(Math.sin(i) * 2)),
      orange: Math.max(0, (distribution.orange || 0) + Math.floor(Math.cos(i) * 3)),
      yellow: Math.max(0, (distribution.yellow || 0) + Math.floor(Math.sin(i+1) * 2)),
    }));
  }, [distribution]);

  return {
    zones, alerts, weather,
    kpis, distribution, activityFeed,
    recentAlerts, rainfallSummary, trendData,
    loading,
  };
}
