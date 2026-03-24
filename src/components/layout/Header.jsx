import { Box, Typography, IconButton, Badge } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { T } from "../../theme/tokens";

const LABELS = {
  "/dashboard":    ["Command Center", "Live Monitoring"],
  "/map":          ["Command Center", "Map View"],
  "/alerts":       ["Command Center", "Alerts"],
  "/crack-reports":["Command Center", "Crack Reports"],
  "/reports":      ["Command Center", "Reports"],
  "/analytics":    ["Command Center", "Analytics"],
  "/admin":        ["Command Center", "Admin Panel"],
  "/profile":      ["Command Center", "Profile"],
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const { currentUser, logout } = useAuth();

  const [parent, current] = LABELS[pathname] || ["Command Center", "Dashboard"];

  return (
    <Box sx={{
      position: "fixed", top: 0, left: 256, right: 0,
      height: 64, zIndex: 40,
      bgcolor: "rgba(14,14,14,0.85)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(91,64,62,0.15)",
      display: "flex", justifyContent: "space-between",
      alignItems: "center", px: 4,
      animation: "shellSlideDown 0.45s ease both",
    }}>
      {/* Breadcrumb */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, animation: "fadeInSoft 0.5s ease 0.08s both" }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#E4BEBA" }}>
          {parent}
        </Typography>
        <Typography sx={{ color: "rgba(228,190,186,0.3)" }}>/</Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#FFB3AD" }}>
          {current}
        </Typography>
      </Box>

      {/* Right */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, animation: "fadeInSoft 0.5s ease 0.14s both" }}>
        <IconButton onClick={() => navigate("/alerts")}
          sx={{ color: "#E4BEBA", "&:hover": { color: "#FFB3AD" } }}>
          <span className="material-symbols-outlined">notifications</span>
        </IconButton>

        <Box onClick={() => navigate("/profile")} sx={{
          width: 32, height: 32, borderRadius: "50%",
          bgcolor: "#3A3939", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid rgba(91,64,62,0.2)",
          "&:hover": { borderColor: "#FFB3AD" },
          transition: "all 0.2s",
        }}>
          <span className="material-symbols-outlined"
            style={{ color: "#E4BEBA", fontSize: 18 }}>person</span>
        </Box>
      </Box>
    </Box>
  );
}
