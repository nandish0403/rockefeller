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
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";
import { formatTimeAgo } from "../../utils/formatUtils";

const LABELS = {
  "/dashboard":    ["Command Center", "Live Monitoring"],
  "/map":          ["Command Center", "Map View"],
  "/alerts":       ["Command Center", "Alerts"],
  "/crack-reports":["Command Center", "Crack Reports"],
  "/reports":      ["Command Center", "Reports"],
  "/analytics":    ["Command Center", "Analytics"],
  "/iot-sensors":  ["Command Center", "IoT Sensors"],
  "/admin":        ["Command Center", "Admin Panel"],
  "/profile":      ["Command Center", "Profile"],
};

export default function Header() {
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

  return (
    <>
      <Box sx={{
        position: "fixed", top: 0, left: `${headerLeft}px`, right: 0,
        height: 64, zIndex: 40,
        bgcolor: "rgba(14,14,14,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(91,64,62,0.15)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", px: 4,
        animation: "shellSlideDown 0.45s ease both",
        transition: "left 0.28s ease",
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
          <IconButton onClick={openDrawer}
            sx={{ color: "#E4BEBA", "&:hover": { color: "#FFB3AD" } }}>
            <Badge color="error" badgeContent={unreadCount > 0 ? unreadCount : null}>
              <span className="material-symbols-outlined">notifications</span>
            </Badge>
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

      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: 380,
            bgcolor: "#161616",
            borderLeft: "1px solid rgba(91,64,62,0.18)",
          },
        }}
      >
        <Box sx={{ px: 2.2, py: 1.8, borderBottom: "1px solid rgba(91,64,62,0.18)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#E5E2E1" }}>Notifications</Typography>
          <Button
            onClick={markAllRead}
            size="small"
            sx={{
              color: "#FFB3AD",
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
            <Typography sx={{ px: 2, py: 3, color: "#9f9a99", fontSize: 12 }}>
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
                  bgcolor: row.is_read ? "rgba(28,27,27,0.45)" : "rgba(38,36,36,0.78)",
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
                    <Typography sx={{ color: "#E5E2E1", fontSize: 12.5, fontWeight: 700 }}>
                      {row.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography sx={{ color: "#bcb7b6", fontSize: 11.5, mt: 0.3 }}>
                        {row.message}
                      </Typography>
                      <Typography sx={{ color: "#9f9a99", fontSize: 10, mt: 0.5 }}>
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
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setSnackbar(null)}
          sx={{ bgcolor: "#2a2a2a", color: "#e5e2e1" }}
        >
          <strong>{snackbar?.title}</strong>
          {snackbar?.message ? ` - ${snackbar.message}` : ""}
        </Alert>
      </Snackbar>
    </>
  );
}
