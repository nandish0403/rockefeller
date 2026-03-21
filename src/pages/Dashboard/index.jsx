import React from "react";
import {
  Box, Typography, Grid, List, ListItemButton,
  ListItemText, Chip, Button, CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "./useDashboardData";
import { KpiRow }               from "../../components/dashboard/KpiRow";
import { RiskTrendChart }        from "../../components/dashboard/RiskTrendChart";
import { ZoneDistributionChart } from "../../components/dashboard/ZoneDistributionChart";
import { ActivityFeed }          from "../../components/dashboard/ActivityFeed";
import { RainfallWidget }        from "../../components/dashboard/RainfallWidget";
import { SectionCard }           from "../../components/common/SectionCard";
import { RiskBadge }             from "../../components/common/RiskBadge";
import { getRiskColor }          from "../../utils/riskUtils";
import { formatTimeAgo }         from "../../utils/formatUtils";

const DashboardPage = () => {
  const navigate = useNavigate();

  // ✅ All names now match exactly what useDashboardData returns
  const {
    kpis, recentAlerts, distribution, trendData,
    activityFeed, rainfallSummary, zones, loading, error,
  } = useDashboardData();

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Box sx={{ p: 3 }}>
      <Typography color="error">Failed to load dashboard: {error}</Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Dashboard
      </Typography>

      {/* KPI Row */}
      <KpiRow kpis={kpis} />

      <Grid container spacing={3} mt={0}>

        {/* Left: Zone List */}
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Monitored Zones"
            action={<Button size="small" onClick={() => navigate("/map")}>Full Map</Button>}
          >
            <List dense disablePadding>
              {(zones ?? []).slice(0, 6).map(zone => (
                <ListItemButton
                  key={zone.id}
                  onClick={() => navigate(`/zones/${zone.id}`)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="white" fontWeight={500}>
                        {zone.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {zone.mine_name} · {zone.district}
                      </Typography>
                    }
                  />
                  <RiskBadge level={zone.risk_level} />
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        </Grid>

        {/* Right: Recent Alerts */}
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Active Alerts"
            action={<Button size="small" onClick={() => navigate("/alerts")}>View All</Button>}
          >
            <List dense disablePadding>
              {(recentAlerts ?? []).length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 2, textAlign: "center" }}>
                  No active alerts
                </Typography>
              ) : (recentAlerts ?? []).map(alert => (
                <ListItemButton
                  key={alert.id}
                  onClick={() => navigate("/alerts")}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="white" fontWeight={500}>
                        {alert.zone_name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {(alert.trigger_reason ?? "No details").substring(0, 60)}
                      </Typography>
                    }
                  />
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                    <RiskBadge level={alert.risk_level} />
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(alert.created_at)}
                    </Typography>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        </Grid>

        {/* Rainfall Widget */}
        <Grid item xs={12} sm={6} md={4}>
          <SectionCard title="Rainfall Summary">
            <RainfallWidget data={rainfallSummary ?? {}} />
          </SectionCard>
        </Grid>

        {/* Risk Trend Chart */}
        <Grid item xs={12} sm={6} md={8}>
          <SectionCard title="Risk Trend (7 Days)">
            <RiskTrendChart data={trendData ?? []} />
          </SectionCard>
        </Grid>

        {/* Zone Distribution */}
        <Grid item xs={12} sm={6}>
          <SectionCard title="Zone Risk Distribution">
            <ZoneDistributionChart distribution={distribution ?? {}} />
          </SectionCard>
        </Grid>

        {/* Activity Feed */}
        <Grid item xs={12} sm={6}>
          <SectionCard title="Recent Activity">
            <ActivityFeed items={activityFeed ?? []} />
          </SectionCard>
        </Grid>

      </Grid>
    </Box>
  );
};

export default DashboardPage;
