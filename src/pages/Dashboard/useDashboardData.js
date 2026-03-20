import { useState, useEffect, useMemo } from "react";
import { fetchZones } from "../../api/zones";
import { fetchAlerts } from "../../api/alerts";

export const useDashboardData = () => {
  const [zones, setZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchZones(), fetchAlerts()])
      .then(([z, a]) => { setZones(z); setAlerts(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return useMemo(() => {
    const kpis = {
      totalZones: zones.length,
      criticalZones: zones.filter((z) => z.risk_level === "red").length,
      activeAlerts: alerts.filter((a) => a.status === "active").length,
      reportsToday: 0,
    };

    const recentAlerts = alerts
      .filter((a) => a.status === "active")
      .slice(0, 5);

    const distribution = ["green", "yellow", "orange", "red"].map((level) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: zones.filter((z) => z.risk_level === level).length,
      color: { green: "#22c55e", yellow: "#eab308", orange: "#f97316", red: "#ef4444" }[level],
    }));

    const trendData = [
      { date: "Mar 13", green: 6, yellow: 4, orange: 3, red: 2 },
      { date: "Mar 14", green: 5, yellow: 4, orange: 4, red: 2 },
      { date: "Mar 15", green: 5, yellow: 3, orange: 4, red: 3 },
      { date: "Mar 16", green: 4, yellow: 4, orange: 4, red: 3 },
      { date: "Mar 17", green: 4, yellow: 3, orange: 5, red: 3 },
      { date: "Mar 18", green: 4, yellow: 3, orange: 5, red: 3 },
    ];

    // ✅ FIX: optional chaining on trigger_reason
    const activityFeed = alerts
      .filter((a) => a && a.zone_name && a.trigger_reason)
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        type: "alert",
        message: `${a.zone_name} — ${a.trigger_reason?.substring(0, 60) ?? ''}...`,
        time: a.created_at,
        risk: a.risk_level,
      }));

    const rainfallSummary = {
      district: "Nagpur",
      warningLevel: "caution",
      rainfallLast24h: 45,
      rainfallLast7d: 310,
      trend: "increasing",
    };

    const distributionObj = {
      green: zones.filter((z) => z.risk_level === "green").length,
      yellow: zones.filter((z) => z.risk_level === "yellow").length,
      orange: zones.filter((z) => z.risk_level === "orange").length,
      red: zones.filter((z) => z.risk_level === "red").length,
    };

    return { kpis, recentAlerts, distribution: distributionObj, trendData, activityFeed, rainfallSummary, zones, alerts, loading };
  }, [zones, alerts, loading]);
};

export default useDashboardData;
