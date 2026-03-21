import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Grid, CircularProgress, Alert, Card, CardContent } from "@mui/material";
import { fetchZones } from "../../api/zones";
import { fetchAlerts } from "../../api/alerts";
import { SectionCard } from "../../components/common/SectionCard";

export default function Analytics() {
  const [zones,   setZones]   = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.all([fetchZones(), fetchAlerts()])
      .then(([z, a]) => { setZones(z); setAlerts(a); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    byRisk: {
      red:    zones.filter(z => z.risk_level === "red").length,
      orange: zones.filter(z => z.risk_level === "orange").length,
      yellow: zones.filter(z => z.risk_level === "yellow").length,
      green:  zones.filter(z => z.risk_level === "green").length,
    },
    alertsByDistrict: alerts.reduce((acc, a) => {
      acc[a.district] = (acc[a.district] || 0) + 1;
      return acc;
    }, {}),
    alertsByStatus: {
      active:       alerts.filter(a => a.status === "active").length,
      acknowledged: alerts.filter(a => a.status === "acknowledged").length,
      resolved:     alerts.filter(a => a.status === "resolved").length,
    },
  }), [zones, alerts]);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Analytics
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Risk Distribution */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Zones by Risk Level">
            {Object.entries(stats.byRisk).map(([level, count]) => (
              <Box key={level} sx={{ display: "flex", justifyContent: "space-between", py: 1,
                borderBottom: "1px solid #222" }}>
                <Typography sx={{ textTransform: "capitalize", color: {
                  red: "#f44336", orange: "#ff9800", yellow: "#ffeb3b", green: "#4caf50"
                }[level] }}>{level}</Typography>
                <Typography color="white" fontWeight={600}>{count} zones</Typography>
              </Box>
            ))}
          </SectionCard>
        </Grid>

        {/* Alert Status */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Alerts by Status">
            {Object.entries(stats.alertsByStatus).map(([status, count]) => (
              <Box key={status} sx={{ display: "flex", justifyContent: "space-between", py: 1,
                borderBottom: "1px solid #222" }}>
                <Typography sx={{ textTransform: "capitalize" }} color="text.secondary">{status}</Typography>
                <Typography color="white" fontWeight={600}>{count}</Typography>
              </Box>
            ))}
          </SectionCard>
        </Grid>

        {/* Alerts by District */}
        <Grid item xs={12}>
          <SectionCard title="Alerts by District">
            <Grid container spacing={2}>
              {Object.entries(stats.alertsByDistrict).map(([district, count]) => (
                <Grid item xs={6} sm={4} md={3} key={district}>
                  <Card sx={{ bgcolor: "#1a1a1a", border: "1px solid #222" }}>
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Typography variant="h4" color="white" fontWeight={700}>{count}</Typography>
                      <Typography variant="body2" color="text.secondary">{district}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
}
