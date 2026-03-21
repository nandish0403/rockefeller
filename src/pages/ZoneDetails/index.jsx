import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Grid, Tabs, Tab, Chip, Button,
  CircularProgress, Alert, Card, CardContent, Stack,
  Divider, List, ListItem, ListItemText, TextField,
  MenuItem, Snackbar,
} from "@mui/material";
import {
  ArrowBack, Warning, Bolt, CrackLine, WaterDrop, Notifications,
} from "@mui/icons-material";
import { useZoneData } from "./useZoneData";
import { useAuth } from "../../context/AuthContext";
import { acknowledgeAlert, resolveAlert } from "../../api/alerts";
import { createBlastEvent } from "../../api/blastEvents";
import { formatTimeAgo } from "../../utils/formatUtils";

// Risk colour map
const RISK_COLORS = {
  red:    "#f44336",
  orange: "#ff9800",
  yellow: "#ffeb3b",
  green:  "#4caf50",
};

// ── Tab panel wrapper ─────────────────────────────────────────
function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Empty state ───────────────────────────────────────────────
function Empty({ label }) {
  return (
    <Typography color="text.secondary" textAlign="center" py={6}>
      No {label} found for this zone.
    </Typography>
  );
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ zone }) {
  const riskColor = RISK_COLORS[zone.risk_level] || "#888";
  const fields = [
    ["Mine Name",       zone.mine_name],
    ["District",        zone.district],
    ["State",           zone.state],
    ["Area (sq km)",    zone.area_sq_km],
    ["Elevation (m)",   zone.elevation_m],
    ["Risk Score",      zone.risk_score?.toFixed(2)],
    ["Blast Count (7d)",zone.blast_count_7d ?? 0],
    ["Recent Rainfall", zone.recent_rainfall ? `${zone.recent_rainfall} mm` : "—"],
    ["Last Updated",    zone.last_updated ? formatTimeAgo(zone.last_updated) : "—"],
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Zone Information
            </Typography>
            {fields.map(([label, value]) => value != null && (
              <Box key={label} sx={{ display: "flex", justifyContent: "space-between",
                py: 1, borderBottom: "1px solid #1a1a1a" }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" color="white" fontWeight={500}>{value}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card sx={{ bgcolor: "#141414", border: `1px solid ${riskColor}44` }}>
          <CardContent sx={{ textAlign: "center", py: 5 }}>
            <Typography variant="h1" sx={{ color: riskColor, fontSize: 80, fontWeight: 700,
              textTransform: "uppercase" }}>
              {zone.risk_level}
            </Typography>
            <Typography color="text.secondary" mt={1}>Current Risk Level</Typography>
            <Typography variant="h4" color="white" fontWeight={700} mt={2}>
              {zone.risk_score ? `${(zone.risk_score * 100).toFixed(0)}%` : "—"}
            </Typography>
            <Typography color="text.secondary" variant="body2">Risk Score</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ── Alerts Tab ────────────────────────────────────────────────
function AlertsTab({ alerts, canAct, onAcknowledge, onResolve }) {
  if (!alerts.length) return <Empty label="alerts" />;
  return (
    <Stack spacing={2}>
      {alerts.map(alert => (
        <Card key={alert.id} sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Box>
                <Chip
                  label={alert.risk_level}
                  size="small"
                  sx={{ bgcolor: RISK_COLORS[alert.risk_level], color: "#000",
                    textTransform: "capitalize", mr: 1, fontWeight: 700 }}
                />
                <Chip label={alert.status} size="small" variant="outlined"
                  sx={{ textTransform: "capitalize" }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {formatTimeAgo(alert.created_at)}
              </Typography>
            </Stack>
            <Typography color="white" variant="body2" mb={0.5}>
              {alert.trigger_reason}
            </Typography>
            {alert.recommended_action && (
              <Typography variant="caption" color="text.secondary">
                💡 {alert.recommended_action}
              </Typography>
            )}
            {canAct && alert.status === "active" && (
              <Stack direction="row" spacing={1} mt={2}>
                <Button size="small" variant="outlined"
                  onClick={() => onAcknowledge(alert.id)}>
                  Acknowledge
                </Button>
                <Button size="small" variant="contained" color="success"
                  onClick={() => onResolve(alert.id)}>
                  Resolve
                </Button>
              </Stack>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ── Blast Events Tab ──────────────────────────────────────────
function BlastEventsTab({ blastEvents, zoneId, onSubmitted }) {
  const [form, setForm]       = useState({ intensity: "", depth_meters: "", explosive_type: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createBlastEvent({ zone_id: zoneId, ...form });
      setForm({ intensity: "", depth_meters: "", explosive_type: "", notes: "" });
      onSubmitted("Blast event logged. Rule engine updated zone risk.");
    } catch {
      setError("Failed to log blast event.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Log New Blast */}
      <Grid item xs={12} md={5}>
        <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent>
            <Typography variant="subtitle2" color="white" fontWeight={600} mb={2}>
              Log Blast Event
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField label="Intensity (1-10)" name="intensity" type="number"
                  inputProps={{ min: 1, max: 10 }}
                  value={form.intensity} onChange={handleChange} size="small" fullWidth />
                <TextField label="Depth (meters)" name="depth_meters" type="number"
                  value={form.depth_meters} onChange={handleChange} size="small" fullWidth />
                <TextField label="Explosive Type" name="explosive_type"
                  value={form.explosive_type} onChange={handleChange} size="small" fullWidth />
                <TextField label="Notes" name="notes" multiline rows={2}
                  value={form.notes} onChange={handleChange} size="small" fullWidth />
                <Button type="submit" variant="contained" disabled={loading}
                  sx={{ bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" } }}>
                  {loading ? <CircularProgress size={18} color="inherit" /> : "Log Blast"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Blast History */}
      <Grid item xs={12} md={7}>
        <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent>
            <Typography variant="subtitle2" color="white" fontWeight={600} mb={2}>
              Blast History
            </Typography>
            {!blastEvents.length ? <Empty label="blast events" /> : (
              <List dense disablePadding>
                {blastEvents.map((b, i) => (
                  <Box key={b.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="white">
                            Intensity {b.intensity ?? "—"} · Depth {b.depth_meters ?? "—"}m
                            {b.explosive_type ? ` · ${b.explosive_type}` : ""}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {b.logged_by} · {formatTimeAgo(b.blast_date)}
                            {b.notes ? ` · ${b.notes}` : ""}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {i < blastEvents.length - 1 && <Divider sx={{ borderColor: "#1a1a1a" }} />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

// ── Crack Reports Tab ─────────────────────────────────────────
function CrackReportsTab({ crackReports }) {
  if (!crackReports.length) return <Empty label="crack reports" />;
  return (
    <Stack spacing={2}>
      {crackReports.map(r => (
        <Card key={r.id} sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Stack direction="row" spacing={1}>
                <Chip label={r.severity} size="small"
                  sx={{ bgcolor: RISK_COLORS[r.severity] || "#666",
                    color: r.severity === "yellow" ? "#000" : "white",
                    textTransform: "capitalize", fontWeight: 700 }} />
                <Chip label={r.crack_type?.replace("_", " ")} size="small" variant="outlined"
                  sx={{ textTransform: "capitalize" }} />
                <Chip label={r.status} size="small" variant="outlined"
                  sx={{ textTransform: "capitalize" }} />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {formatTimeAgo(r.created_at)}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Reported by: {r.reported_by}
              {r.ai_risk_score != null && ` · AI Score: ${(r.ai_risk_score * 100).toFixed(0)}%`}
            </Typography>
            {r.remarks && (
              <Typography variant="body2" color="white" mt={1}>{r.remarks}</Typography>
            )}
            {r.photo_url && (
              <Box mt={2}>
                <img
                  src={`http://localhost:8000${r.photo_url}`}
                  alt="crack"
                  style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 4,
                    border: "1px solid #333" }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ── Weather Tab ───────────────────────────────────────────────
function WeatherTab({ weather, district }) {
  if (!weather.length) return <Empty label={`weather records for ${district}`} />;
  return (
    <Stack spacing={2}>
      {weather.slice(0, 10).map(w => (
        <Card key={w.id} sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
          <CardContent sx={{ py: "12px !important" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography color="white" fontWeight={600}>
                  {w.rainfall_mm} mm
                  {w.trend && (
                    <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                      ({w.trend})
                    </Typography>
                  )}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {w.district} · {formatTimeAgo(w.recorded_at)}
                </Typography>
              </Box>
              <Chip
                label={w.warning_level}
                size="small"
                sx={{
                  textTransform: "capitalize",
                  bgcolor: { extreme: "#f44336", warning: "#ff9800",
                             watch: "#ffeb3b", none: "#4caf50" }[w.warning_level] || "#555",
                  color: w.warning_level === "watch" ? "#000" : "white",
                  fontWeight: 700,
                }}
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ZoneDetails() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const canAct = ["admin", "safety_officer"].includes(currentUser?.role);

  const { zone, alerts, crackReports, blastEvents, weather,
          loading, error, refetch } = useZoneData();

  const [tab,   setTab]   = useState(0);
  const [toast, setToast] = useState("");

  const handleAcknowledge = async (id) => {
    await acknowledgeAlert(id);
    setToast("Alert acknowledged");
    refetch();
  };

  const handleResolve = async (id) => {
    await resolveAlert(id);
    setToast("Alert resolved");
    refetch();
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress />
    </Box>
  );

  if (error || !zone) return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">{error || "Zone not found"}</Alert>
    </Box>
  );

  const riskColor = RISK_COLORS[zone.risk_level] || "#888";

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={1}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}
          sx={{ color: "text.secondary" }}>
          Back
        </Button>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap">
        <Typography variant="h5" fontWeight={700} color="white">
          {zone.name}
        </Typography>
        <Chip
          label={zone.risk_level?.toUpperCase()}
          sx={{ bgcolor: riskColor, color: zone.risk_level === "yellow" ? "#000" : "white",
            fontWeight: 700, fontSize: 13 }}
        />
        <Typography color="text.secondary" variant="body2">
          {zone.mine_name} · {zone.district}
        </Typography>
      </Stack>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: "1px solid #222", mb: 0 }}>
        <Tab label="Overview" />
        <Tab label={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <span>Alerts</span>
            {alerts.length > 0 && (
              <Chip label={alerts.length} size="small" color="error"
                sx={{ height: 18, fontSize: 10 }} />
            )}
          </Stack>
        } />
        <Tab label={`Blast Events (${blastEvents.length})`} />
        <Tab label={`Crack Reports (${crackReports.length})`} />
        <Tab label="Weather" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <OverviewTab zone={zone} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <AlertsTab
          alerts={alerts}
          canAct={canAct}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
        />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <BlastEventsTab
          blastEvents={blastEvents}
          zoneId={zone.id}
          onSubmitted={msg => { setToast(msg); refetch(); }}
        />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <CrackReportsTab crackReports={crackReports} />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <WeatherTab weather={weather} district={zone.district} />
      </TabPanel>

      <Snackbar open={!!toast} autoHideDuration={4000}
        onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
