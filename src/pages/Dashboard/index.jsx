import React from 'react';
import { Box, Typography, Grid, List, ListItemButton, ListItemText, Chip, Button } from '@mui/material';
import { MapContainer, TileLayer, Polygon, Tooltip } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from './useDashboardData';
import { KpiRow } from '../../components/dashboard/KpiRow';
import { RiskTrendChart } from '../../components/dashboard/RiskTrendChart';
import { ZoneDistributionChart } from '../../components/dashboard/ZoneDistributionChart';
import { ActivityFeed } from '../../components/dashboard/ActivityFeed';
import { RainfallWidget } from '../../components/dashboard/RainfallWidget';
import { SectionCard } from '../../components/common/SectionCard';
import { RiskBadge } from '../../components/common/RiskBadge';
import { getRiskColor } from '../../utils/riskUtils';
import { formatTimeAgo } from '../../utils/formatUtils';

const DashboardPage = () => {
  const navigate = useNavigate();
  const {
    kpis, recentAlerts, distribution, trendData,
    activityFeed, rainfallSummary, zones, loading,
  } = useDashboardData();

  if (loading) return <Box sx={{ p: 4 }}><Typography>Loading...</Typography></Box>;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Dashboard</Typography>

      <KpiRow kpis={kpis} />

      <Grid container spacing={3} mt={1}>
        {/* Left: Mini Map */}
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Zone Map"
            action={<Button size="small" onClick={() => navigate('/map')}>Full Map</Button>}
          >
            <MapContainer
              center={[20.5, 78.9]}
              zoom={6}
              style={{ height: 300, borderRadius: 8 }}
              zoomControl={false}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {zones.map((zone) => (
                <Polygon
                  key={zone.id}
                  positions={zone.latlngs}
                  pathOptions={{ color: getRiskColor(zone.risk_level), fillOpacity: 0.4 }}
                  eventHandlers={{ click: () => navigate(`/zones/${zone.id}`) }}
                >
                  <Tooltip>
                    <Typography variant="caption" fontWeight={600}>{zone.name}</Typography><br />
                    <Typography variant="caption">{zone.mine_name}</Typography>
                  </Tooltip>
                </Polygon>
              ))}
            </MapContainer>
          </SectionCard>
        </Grid>

        {/* Right: Recent Alerts */}
        <Grid item xs={12} md={6}>
          <SectionCard
            title="Recent Active Alerts"
            action={<Button size="small" onClick={() => navigate('/alerts')}>View All</Button>}
          >
            <List dense disablePadding>
              {recentAlerts.map((alert) => (
                <ListItemButton
                  key={alert.id}
                  onClick={() => navigate('/alerts')}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {/* ✅ FIX: snake_case field + optional chaining */}
                        <Typography variant="body2" fontWeight={600}>{alert.zone_name}</Typography>
                        <RiskBadge level={alert.risk_level} />
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {(alert.trigger_reason ?? 'No details').substring(0, 80)}...
                      </Typography>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" ml={1}>
                    {formatTimeAgo(alert.created_at)}
                  </Typography>
                </ListItemButton>
              ))}
            </List>
          </SectionCard>
        </Grid>

        {/* Rainfall Widget */}
        <Grid item xs={12} md={4}>
          <RainfallWidget data={rainfallSummary} />
        </Grid>

        {/* Risk Trend */}
        <Grid item xs={12} md={8}>
          <RiskTrendChart data={trendData} />
        </Grid>

        {/* Zone Distribution */}
        <Grid item xs={12} md={4}>
          <ZoneDistributionChart distribution={distribution} />
        </Grid>

        {/* Activity Feed */}
        <Grid item xs={12} md={8}>
          <ActivityFeed items={activityFeed} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
