import { useState, useEffect } from "react";
import {
  Box, Typography, Grid, CircularProgress, Alert,
  Card, CardContent, Chip, Stack, Divider,
} from "@mui/material";
import { fetchZones } from "../../api/zones";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function Admin() {
  const { currentUser } = useAuth();
  const [zones,   setZones]   = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.all([
      fetchZones(),
      api.get("/api/auth/users").then(r => r.data),
    ])
      .then(([z, u]) => { setZones(z); setUsers(u); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={1}>
        Admin Panel
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Logged in as {currentUser?.name} · {currentUser?.role}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary Cards */}
      <Grid container spacing={2} mb={4}>
        {[
          { label: "Total Zones",  value: zones.length },
          { label: "Red Zones",    value: zones.filter(z => z.risk_level === "red").length },
          { label: "Total Users",  value: users.length },
          { label: "Field Workers", value: users.filter(u => u.role === "field_worker").length },
        ].map(stat => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography variant="h4" color="white" fontWeight={700}>{stat.value}</Typography>
                <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Users Table */}
      <Typography variant="h6" color="white" fontWeight={600} mb={2}>Users</Typography>
      <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
        {users.map((u, i) => (
          <Box key={u.id}>
            <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography color="white" fontWeight={500}>{u.name}</Typography>
                <Typography variant="body2" color="text.secondary">{u.email}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                {u.district && <Chip label={u.district} size="small" variant="outlined" />}
                <Chip
                  label={u.role?.replace("_", " ")}
                  size="small"
                  sx={{
                    bgcolor: { admin: "#e53935", safety_officer: "#ff9800", field_worker: "#4caf50" }[u.role],
                    color: "white", textTransform: "capitalize",
                  }}
                />
              </Stack>
            </Box>
            {i < users.length - 1 && <Divider sx={{ borderColor: "#222" }} />}
          </Box>
        ))}
      </Card>
    </Box>
  );
}
