import { useState } from "react";
import { Box, Typography, MenuItem, TextField, Stack, CircularProgress } from "@mui/material";
import { useCrackData } from "./useCrackData";
import { CrackReportList } from "../../components/crack/CrackReportList";

const CRACK_TYPES = ["Parallel Crack", "Tension Crack", "Shear Crack", "Settlement Crack"];
const SEVERITIES  = ["low", "medium", "high", "critical"];

export default function CrackReports() {
  const [filters, setFilters] = useState({ crack_type: "", severity: "" });
  const { reports, loading, error } = useCrackData(filters);

  const update = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Crack Reports
      </Typography>

      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <TextField select label="Crack Type" size="small" value={filters.crack_type}
          onChange={e => update("crack_type", e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All Types</MenuItem>
          {CRACK_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField select label="Severity" size="small" value={filters.severity}
          onChange={e => update("severity", e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">All Severities</MenuItem>
          {SEVERITIES.map(s => (
            <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <CrackReportList reports={reports} />
      )}
    </Box>
  );
}
