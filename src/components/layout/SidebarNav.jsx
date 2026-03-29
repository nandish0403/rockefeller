import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { T } from "../../theme/tokens";

const NAV = [
  { label: "Dashboard",     icon: "dashboard",            to: "/dashboard" },
  { label: "Map View",      icon: "map",                  to: "/map" },
  { label: "Alerts",        icon: "notifications_active", to: "/alerts" },
  { label: "Crack Reports", icon: "running_with_errors",  to: "/crack-reports" },
  { label: "Reports",       icon: "description",          to: "/reports" },
  { label: "Analytics",     icon: "analytics",            to: "/analytics" },
  { label: "Predictions",   icon: "timeline",             to: "/predictions" },
  { label: "IoT Sensors",   icon: "sensors",              to: "/iot-sensors" },
  { label: "Upload",        icon: "upload_file",          to: "/upload" },
];

export default function SidebarNav() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMapRoute = pathname === "/map";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{
      position: "fixed", left: 0, top: 0,
      width: isMapRoute ? 96 : 256, height: "100vh",
      bgcolor: "#0E0E0E",
      borderRight: "1px solid rgba(91,64,62,0.15)",
      display: "flex", flexDirection: "column",
      py: 3, zIndex: 50,
      animation: "shellSlideInLeft 0.45s ease both",
      transition: "width 0.28s ease",
    }}>
      {/* Logo */}
      <Box onClick={() => navigate("/dashboard")} sx={{ px: 3, mb: 5, cursor: "pointer" }}>
        <Typography sx={{
          fontSize: isMapRoute ? 17 : 20, fontWeight: 700,
          letterSpacing: "-0.05em", color: "#E5E2E1",
          fontFamily: "Inter",
          animation: "floatIcon 3s ease-in-out infinite",
        }}>
          {isMapRoute ? "R" : "Rockefeller"}
        </Typography>
        {!isMapRoute && (
          <Typography sx={{
            fontSize: "0.6875rem", fontWeight: 300,
            letterSpacing: "0.1em", color: "#E4BEBA",
            fontFamily: "Inter",
          }}>
            Maharashtra, India
          </Typography>
        )}
      </Box>

      {/* Nav */}
      <Box component="nav" sx={{ flex: 1 }}>
        {NAV.map(({ label, icon, to }, idx) => (
          <NavLink key={to} to={to} style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: isMapRoute ? 2.25 : 3, py: 1.5,
                borderLeft: isActive
                  ? "2px solid #FFB3AD"
                  : "2px solid transparent",
                color:   isActive ? "#FFB3AD" : "#E4BEBA",
                opacity: isActive ? 1 : 0.7,
                fontSize: "0.6875rem", fontWeight: 300,
                letterSpacing: "0.1em", fontFamily: "Inter",
                cursor: "pointer",
                transition: "all 0.2s",
                animation: `fadeUpSoft 0.4s ease ${0.07 + idx * 0.035}s both`,
                "&:hover": {
                  bgcolor: "#201F1F",
                  color: "#FFB3AD",
                  opacity: 1,
                  "& .material-symbols-outlined": {
                    transform: "scale(1.15)",
                  },
                },
              }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: 20,
                    transform: "scale(1)",
                    transition: "transform 150ms ease, filter 150ms ease",
                    filter: isActive
                      ? "drop-shadow(0 0 8px rgba(255,179,173,0.35))"
                      : "none",
                  }}>
                  {icon}
                </span>
                {!isMapRoute && label}
              </Box>
            )}
          </NavLink>
        ))}

        {/* Admin link — only for admins */}
        {currentUser?.role === "admin" && (
          <NavLink to="/admin" style={{ textDecoration: "none" }}>
            {({ isActive }) => (
              <Box sx={{
                display: "flex", alignItems: "center", gap: 2,
                px: isMapRoute ? 2.25 : 3, py: 1.5,
                borderLeft: isActive
                  ? "2px solid #FFB3AD"
                  : "2px solid transparent",
                color:   isActive ? "#FFB3AD" : "#E4BEBA",
                opacity: isActive ? 1 : 0.7,
                fontSize: "0.6875rem", fontWeight: 300,
                letterSpacing: "0.1em", fontFamily: "Inter",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "#201F1F",
                  color: "#FFB3AD",
                  opacity: 1,
                  "& .material-symbols-outlined": {
                    transform: "scale(1.15)",
                  },
                },
              }}>
                <span className="material-symbols-outlined"
                  style={{
                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                    fontSize: 20,
                    transform: "scale(1)",
                    transition: "transform 150ms ease, filter 150ms ease",
                    filter: isActive
                      ? "drop-shadow(0 0 8px rgba(255,179,173,0.35))"
                      : "none",
                  }}>
                  admin_panel_settings
                </span>
                {!isMapRoute && "Admin"}
              </Box>
            )}
          </NavLink>
        )}
      </Box>

      {/* User card */}
      <Box sx={{ px: 3 }}>
        <Box onClick={() => navigate("/profile")} sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          p: 1.5, borderRadius: "4px",
          bgcolor: "#1C1B1B", cursor: "pointer",
          "&:hover": { bgcolor: "#2A2A2A" },
          transition: "all 0.2s",
          animation: "fadeInSoft 0.45s ease 0.3s both",
        }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: "50%",
            bgcolor: "rgba(255,179,173,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined"
              style={{ color: "#FFB3AD", fontSize: 18 }}>
              account_circle
            </span>
          </Box>
          {!isMapRoute && (
            <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#E5E2E1" }}>
              {currentUser?.name || "Guest"}
            </Typography>
            <Typography sx={{ fontSize: 9, color: "#E4BEBA", textTransform: "capitalize" }}>
              {currentUser?.role || "—"}
            </Typography>
            </Box>
          )}
        </Box>

        <Box
          onClick={handleLogout}
          sx={{
            mt: 1,
            p: 1.3,
            borderRadius: "4px",
            border: "1px solid rgba(255,179,173,0.22)",
            color: "#E4BEBA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
            "&:hover": {
              color: "#FFB3AD",
              borderColor: "#FFB3AD",
              background: "rgba(255,179,173,0.08)",
            },
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            logout
          </span>
          {!isMapRoute && "Logout"}
        </Box>
      </Box>

      <style>{`@keyframes floatIcon { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }`}</style>
    </Box>
  );
}
