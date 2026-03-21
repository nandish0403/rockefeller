import { useAuth } from "../../context/AuthContext";
import {
  Box, Typography, Card, CardContent, Avatar,
  Grid, Chip, Divider,
} from "@mui/material";
import { Shield, LocationOn, Email, Badge } from "@mui/icons-material";

export default function Profile() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const roleColor = {
    admin: "#e53935",
    safety_officer: "#ff9800",
    field_worker: "#4caf50",
  }[currentUser.role] || "#888";

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Profile
      </Typography>

      <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
        <CardContent sx={{ p: 4 }}>
          {/* Avatar + name */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 3, mb: 3 }}>
            <Avatar sx={{ width: 72, height: 72, bgcolor: "#e53935", fontSize: 28 }}>
              {currentUser.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" color="white" fontWeight={600}>
                {currentUser.name}
              </Typography>
              <Chip
                label={currentUser.role?.replace("_", " ")}
                size="small"
                sx={{ bgcolor: roleColor, color: "white", textTransform: "capitalize", mt: 0.5 }}
              />
            </Box>
          </Box>

          <Divider sx={{ borderColor: "#222", mb: 3 }} />

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Email sx={{ color: "#888", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography color="white">{currentUser.email}</Typography>
                </Box>
              </Box>
            </Grid>
            {currentUser.district && (
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <LocationOn sx={{ color: "#888", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">District</Typography>
                    <Typography color="white">{currentUser.district}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            {currentUser.zone_assigned && (
              <Grid item xs={12}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Shield sx={{ color: "#888", fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Assigned Zone</Typography>
                    <Typography color="white">{currentUser.zone_assigned}</Typography>
                  </Box>
                </Box>
              </Grid>
            )}
            <Grid item xs={12}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Badge sx={{ color: "#888", fontSize: 20 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography color="white" variant="body2" sx={{ fontFamily: "monospace" }}>
                    {currentUser.id}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
