import {
  Alert,
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { useThemeMode } from "../../context/ThemeModeContext";
import { formatTimeAgo } from "../../utils/formatUtils";

const LABELS = {
  "/dashboard":    ["Command Center", "Live Monitoring"],
  "/map":          ["Command Center", "Map View"],
  "/alerts":       ["Command Center", "Alerts"],
  "/crack-reports":["Command Center", "Crack Reports"],
  "/reports":      ["Command Center", "Reports"],
  "/analytics":    ["Command Center", "Analytics"],
  "/iot-sensors":  ["Command Center", "IoT Sensors"],
  "/field-report": ["Command Center", "Field Report"],
  "/admin":        ["Command Center", "Admin Panel"],
  "/profile":      ["Command Center", "Profile"],
};

export default function Header() {
  const theme = useTheme();
  const { mode } = useThemeMode();
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const {
    notifications,
    unreadCount,
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    markRead,
    markAllRead,
    snackbar,
    setSnackbar,
  } = useNotifications();
  const isMapRoute = pathname === "/map";
  const headerLeft = isMapRoute ? 96 : 256;
  const isLight = mode === "light";

  const dynamicLabel = pathname.startsWith("/reports/")
    ? ["Command Center", "Report Details"]
    : pathname.startsWith("/zones/")
      ? ["Command Center", "Zone Details"]
      : null;

  const [parent, current] = dynamicLabel || LABELS[pathname] || ["Command Center", "Dashboard"];

  const iconByType = (type) => {
    if (type === "alert") return { icon: "priority_high", color: "#ff5451" };
    if (type === "warning") return { icon: "warning", color: "#ffb95f" };
    return { icon: "info", color: "#64b5f6" };
  };

  const handleNotificationClick = async (row) => {
    if (!row.is_read) {
      await markRead(row.id);
    }
    if (row.zone_id) {
      closeDrawer();
      navigate(`/zones/${row.zone_id}`);
    }
  };

  const snackbarSeverity = (type) => {
    if (type === "alert") return "error";
    if (type === "warning") return "warning";
    return "info";
  };

  return (
    <>
      <Box sx={{
        position: "fixed", top: 0, left: `${headerLeft}px`, right: 0,
        height: 64, zIndex: 40,
        bgcolor: isLight ? "rgba(255,255,255,0.88)" : "rgba(14,14,14,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: isLight
          ? "1px solid rgba(171,179,183,0.42)"
          : "1px solid rgba(91,64,62,0.15)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", px: 4,
        animation: "shellSlideDown 0.45s ease both",
        transition: "left 0.28s ease",
      }}>
        {/* Breadcrumb */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, animation: "fadeInSoft 0.5s ease 0.08s both" }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: theme.palette.text.secondary }}>
            {parent}
          </Typography>
          <Typography sx={{ color: isLight ? "rgba(88,96,100,0.35)" : "rgba(228,190,186,0.3)" }}>/</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: theme.palette.primary.main }}>
            {current}
          </Typography>
        </Box>

        {/* Right */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, animation: "fadeInSoft 0.5s ease 0.14s both" }}>
          <IconButton onClick={openDrawer}
            sx={{ color: theme.palette.text.secondary, "&:hover": { color: theme.palette.primary.main } }}>
            <Badge color="error" badgeContent={unreadCount > 0 ? unreadCount : null}>
              <span className="material-symbols-outlined">notifications</span>
            </Badge>
          </IconButton>

          <Box onClick={() => navigate("/profile")} sx={{
            width: 32, height: 32, borderRadius: "50%",
            bgcolor: isLight ? "#e3e9ec" : "#3A3939", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: isLight
              ? "1px solid rgba(171,179,183,0.45)"
              : "1px solid rgba(91,64,62,0.2)",
            "&:hover": { borderColor: theme.palette.primary.main },
            transition: "all 0.2s",
          }}>
            <span className="material-symbols-outlined"
              style={{ color: isLight ? "#2b3437" : "#E4BEBA", fontSize: 18 }}>person</span>
          </Box>
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 380,
            bgcolor: theme.palette.background.paper,
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Box sx={{ px: 2.2, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: theme.palette.text.primary }}>Notifications</Typography>
          <Button
            onClick={markAllRead}
            size="small"
            sx={{
              color: theme.palette.primary.main,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Mark all read
          </Button>
        </Box>

        <List sx={{ px: 0.5, py: 1, overflowY: "auto", flex: 1 }}>
          {notifications.length === 0 && (
            <Typography sx={{ px: 2, py: 3, color: theme.palette.text.secondary, fontSize: 12 }}>
              No notifications yet.
            </Typography>
          )}
          {notifications.map((row) => {
            const tone = iconByType(row.type);
            return (
              <ListItemButton
                key={row.id}
                onClick={() => handleNotificationClick(row)}
                sx={{
                  mb: 0.8,
                  mx: 0.8,
                  borderRadius: "4px",
                  borderLeft: row.is_read ? "2px solid transparent" : `2px solid ${tone.color}`,
                  bgcolor: row.is_read
                    ? (isLight ? "rgba(234,239,241,0.65)" : "rgba(28,27,27,0.45)")
                    : (isLight ? "rgba(229,226,227,0.6)" : "rgba(38,36,36,0.78)"),
                  alignItems: "flex-start",
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, mt: 0.2 }}>
                  <span className="material-symbols-outlined" style={{ color: tone.color, fontSize: 18 }}>
                    {tone.icon}
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ color: theme.palette.text.primary, fontSize: 12.5, fontWeight: 700 }}>
                      {row.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11.5, mt: 0.3 }}>
                        {row.message}
                      </Typography>
                      <Typography sx={{ color: theme.palette.text.secondary, opacity: 0.85, fontSize: 10, mt: 0.5 }}>
                        {formatTimeAgo(row.created_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={5500}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 7.5, mr: 1.5 }}
      >
        <Alert
          severity={snackbarSeverity(snackbar?.type)}
          variant="filled"
          onClose={() => setSnackbar(null)}
          sx={{
            minWidth: 320,
            borderRadius: "8px",
            border: isLight
              ? "1px solid rgba(171,179,183,0.45)"
              : "1px solid rgba(91,64,62,0.25)",
            boxShadow: isLight
              ? "0 12px 24px rgba(43,52,55,0.14)"
              : "0 16px 28px rgba(0,0,0,0.5)",
            bgcolor: isLight ? "#ffffff" : "#252526",
            color: isLight ? "#2b3437" : "#e5e2e1",
            "& .MuiAlert-icon": {
              color: isLight ? "#2b3437" : "#ffb3ad",
            },
            "& .MuiAlert-action": {
              color: isLight ? "#2b3437" : "#e4beba",
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
            <Typography sx={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 800, opacity: 0.75 }}>
              ROCKEFELLER
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
              {snackbar?.title}
            </Typography>
            {snackbar?.message && (
              <Typography sx={{ fontSize: 11, opacity: 0.9 }}>
                {snackbar.message}
              </Typography>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </>
  );
}
