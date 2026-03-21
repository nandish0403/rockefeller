import { useState, useEffect } from "react";
import {
  Box, Typography, MenuItem, TextField,
  Stack, CircularProgress, Alert,
} from "@mui/material";
import { fetchReports } from "../../api/reports";
import { fetchZones } from "../../api/zones";
import { ReportCard } from "../../components/reports/ReportCard";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [zones,   setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [zoneFilter, setZoneFilter] = useState("");

  useEffect(() => {
    Promise.all([fetchReports(), fetchZones()])
      .then(([r, z]) => { setReports(r); setZones(z); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = zoneFilter
    ? reports.filter(r => r.zone_id === zoneFilter)
    : reports;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Field Reports
      </Typography>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField select label="Filter by Zone" size="small" value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="">All Zones</MenuItem>
          {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={8}>
          No reports found.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {filtered.map(r => <ReportCard key={r.id} report={r} />)}
        </Stack>
      )}
    </Box>
  );
}
