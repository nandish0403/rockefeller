import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ErrorOutline, NotificationsActive, History } from '@mui/icons-material';
import { AlertList } from '../../components/alerts/AlertList';
import { KpiCard } from '../../components/common/KpiCard';
import { brandTokens } from '../../theme';
import { fetchAlerts, acknowledgeAlert, resolveAlert } from '../../api/alerts';
import { fetchZones } from '../../api/zones';

const AlertsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [allAlerts, setAllAlerts] = useState([]);
  const [zones, setZones] = useState([]);
  const [filters, setFilters] = useState({ zone: '', riskLevel: '' });

  useEffect(() => {
    fetchAlerts().then(setAllAlerts).catch(console.error);
    fetchZones().then(setZones).catch(console.error);
  }, []);

  const TAB_STATUSES = ['active', 'acknowledged', 'resolved'];
  const currentStatus = TAB_STATUSES[tab];

  const filteredAlerts = useMemo(() => {
    return allAlerts.filter((a) => {
      if (a.status !== currentStatus) return false;
      if (filters.zone && a.zone_id !== filters.zone) return false;
      if (filters.riskLevel && a.risk_level !== filters.riskLevel) return false;
      return true;
    });
  }, [allAlerts, currentStatus, filters]);

  const summary = useMemo(() => ({
    active: allAlerts.filter((a) => a.status === 'active').length,
    critical: allAlerts.filter((a) => a.status === 'active' && a.risk_level === 'red').length,
    resolvedToday: allAlerts.filter((a) => a.status === 'resolved').length,
  }), [allAlerts]);

  // ✅ FIX: added missing closing } for both functions
  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id);
    } catch {
      // fallback
    } finally {
      setAllAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'acknowledged' } : a));
    }
  }; // ✅ properly closed

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
    } catch {
      // fallback
    } finally {
      setAllAlerts((prev) => prev.map((a) => a.id === id ? { ...a, status: 'resolved' } : a));
    }
  }; // ✅ properly closed

  const handleViewMap = () => navigate('/map');

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} mb={3}>Alerts</Typography>

      {/* Summary KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <KpiCard label="Active Alerts" value={summary.active} icon={<NotificationsActive />} color={brandTokens?.risk?.orange || '#f97316'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard label="Critical Alerts" value={summary.critical} icon={<ErrorOutline />} color={brandTokens?.risk?.red || '#ef4444'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <KpiCard label="Resolved" value={summary.resolvedToday} icon={<History />} color={brandTokens?.risk?.green || '#22c55e'} />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="Active" />
        <Tab label="Acknowledged" />
        <Tab label="Resolved" />
      </Tabs>

      {/* Filters */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Zone</InputLabel>
            <Select value={filters.zone} label="Zone" onChange={(e) => setFilters((p) => ({ ...p, zone: e.target.value }))}>
              <MenuItem value="">All Zones</MenuItem>
              {zones.map((z) => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth size="small">
            <InputLabel>Risk Level</InputLabel>
            <Select value={filters.riskLevel} label="Risk Level" onChange={(e) => setFilters((p) => ({ ...p, riskLevel: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="red">Critical</MenuItem>
              <MenuItem value="orange">High</MenuItem>
              <MenuItem value="yellow">Caution</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Alert List */}
      <AlertList
        alerts={filteredAlerts}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onViewMap={handleViewMap}
      />
    </Box>
  );
};

export default AlertsPage;
