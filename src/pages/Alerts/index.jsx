import { useState, useEffect, useCallback } from "react";
import {
  Box, Tabs, Tab, Typography, CircularProgress,
  Alert as MuiAlert, Chip, Button, Stack, MenuItem,
  TextField, Snackbar,
} from "@mui/material";
import { fetchAlerts, acknowledgeAlert, resolveAlert } from "../../api/alerts";
import AlertList from "../../components/alerts/AlertList";
import { useAuth } from "../../context/AuthContext";

const STATUS_TABS = ["active", "acknowledged", "resolved"];

export default function AlertsPage() {
  const { currentUser } = useAuth();
  const canAct = ["admin", "safety_officer"].includes(currentUser?.role);

  const [tabIndex,  setTabIndex]  = useState(0);
  const [alerts,    setAlerts]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [district,  setDistrict]  = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [toast,     setToast]     = useState("");

  const currentStatus = STATUS_TABS[tabIndex];

  const loadAlerts = useCallback(() => {
    setLoading(true);
    const params = { status: currentStatus };
    if (district)  params.district   = district;
    if (riskLevel) params.risk_level = riskLevel;
    fetchAlerts(params)
      .then(setAlerts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentStatus, district, riskLevel]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeAlert(id);
      setToast("Alert acknowledged");
      loadAlerts();
    } catch { setError("Failed to acknowledge alert"); }
  };

  const handleResolve = async (id) => {
    try {
      await resolveAlert(id);
      setToast("Alert resolved");
      loadAlerts();
    } catch { setError("Failed to resolve alert"); }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Alerts
      </Typography>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <TextField
          select label="District" size="small" value={district}
          onChange={e => setDistrict(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All Districts</MenuItem>
          {["Nagpur","Chandrapur","Gadchiroli","Yavatmal","Amravati"].map(d => (
            <MenuItem key={d} value={d}>{d}</MenuItem>
          ))}
        </TextField>
        <TextField
          select label="Risk Level" size="small" value={riskLevel}
          onChange={e => setRiskLevel(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All Levels</MenuItem>
          {["red","orange","yellow","green"].map(r => (
            <MenuItem key={r} value={r} sx={{ textTransform: "capitalize" }}>{r}</MenuItem>
          ))}
        </TextField>
        {(district || riskLevel) && (
          <Button size="small" onClick={() => { setDistrict(""); setRiskLevel(""); }}>
            Clear
          </Button>
        )}
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: "1px solid #222" }}
      >
        {STATUS_TABS.map((s, i) => (
          <Tab
            key={s}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span style={{ textTransform: "capitalize" }}>{s}</span>
                {i === tabIndex && (
                  <Chip label={alerts.length} size="small" color="primary" />
                )}
              </Stack>
            }
          />
        ))}
      </Tabs>

      {/* Content */}
      {error && <MuiAlert severity="error" sx={{ mb: 2 }}>{error}</MuiAlert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : alerts.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={8}>
          No {currentStatus} alerts found.
        </Typography>
      ) : (
        <AlertList
          alerts={alerts}
          canAct={canAct}
          currentStatus={currentStatus}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
        />
      )}

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast("")}
        message={toast}
      />
    </Box>
  );
}
