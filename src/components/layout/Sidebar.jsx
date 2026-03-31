import { NavLink, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { T } from "../../theme/tokens";

const NAV = [
  { label: "Dashboard",     icon: "dashboard",           to: "/dashboard" },
  { label: "Map View",      icon: "map",                 to: "/map" },
  { label: "Alerts",        icon: "notifications_active",to: "/alerts" },
  { label: "Crack Reports", icon: "running_with_errors", to: "/crack-reports" },
  { label: "Reports",       icon: "description",         to: "/reports" },
  { label: "Analytics",     icon: "analytics",           to: "/analytics" },
  { label: "IoT Sensors",   icon: "sensors",             to: "/iot-sensors" },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Box component="aside" sx={{
      position: "fixed", left: 0, top: 0,
      width: 256, height: "100vh",
      bgcolor: T.surfaceLowest,
      borderRight: `1px solid rgba(91,64,62,0.15)`,
      display: "flex", flexDirection: "column",
      py: 3, zIndex: 50,
      overflow: "hidden",
    }}>
      {/* Logo */}
      <Box sx={{ px: 3, mb: 5 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 700,
          letterSpacing: "-0.05em", color: T.onSurface, fontFamily: "Inter" }}>
          Rockefeller
        </Typography>
        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 300,
          letterSpacing: "0.1em", color: T.onSurfaceVar, fontFamily: "Inter" }}>
          Maharashtra, India
        </Typography>
      </Box>

      {/* Nav Links */}
      <Box component="nav" sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        overflowY: "auto",
        overflowX: "hidden",
        pb: 1,
        "&::-webkit-scrollbar": { width: 4 },
        "&::-webkit-scrollbar-track": { background: "transparent" },
        "&::-webkit-scrollbar-thumb": { background: "rgba(58,57,57,0.9)", borderRadius: 10 },
      }}>
        {NAV.map(({ label, icon, to }) => (
          <NavLink key={to} to={to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: 3, py: 1.5, cursor: "pointer",
                borderLeft: isActive ? `2px solid ${T.primary}` : "2px solid transparent",
                color: isActive ? T.primary : T.onSurfaceVar,
                opacity: isActive ? 1 : 0.7,
                transition: "all 0.2s",
                fontSize: "0.6875rem", fontWeight: 300,
                letterSpacing: "0.1em", fontFamily: "Inter",
                "&:hover": { bgcolor: T.surfaceCont, color: T.primary, opacity: 1 },
              }}>
                <span className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: 20 }}>
                  {icon}
                </span>
                {label}
              </Box>
            )}
          </NavLink>
        ))}
      </Box>

      {/* User Card */}
      <Box sx={{ px: 3, flexShrink: 0 }}>
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          p: 1.5, borderRadius: 1, bgcolor: T.surfaceLow, cursor: "pointer",
          "&:hover": { bgcolor: T.surfaceHigh },
          transition: "all 0.2s",
        }} onClick={() => navigate("/profile")}>
          <Box sx={{
            width: 32, height: 32, borderRadius: "50%",
            bgcolor: `${T.primary}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined"
              style={{ color: T.primary, fontSize: 18 }}>account_circle</span>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.onSurface }}>
              {currentUser?.name || "Admin Portal"}
            </Typography>
            <Typography sx={{ fontSize: 9, color: T.onSurfaceVar }}>
              {currentUser?.role || "System Active"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
