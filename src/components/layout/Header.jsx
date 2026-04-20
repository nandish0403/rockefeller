import {
  Avatar,
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
    if (type === "alert") return { icon: "priority_high", color: "#ff5451", bubble: "#3a1817" };
    if (type === "warning") return { icon: "warning", color: "#ffb95f", bubble: "#3a2a12" };
    return { icon: "chat", color: "#4edea3", bubble: "#17382f" };
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

  const openFromSnackbar = async () => {
    if (!snackbar) return;
    if (snackbar.id) {
      await markRead(snackbar.id);
    }
    setSnackbar(null);
    if (snackbar.zone_id) {
      navigate(`/zones/${snackbar.zone_id}`);
    }
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
            width: 390,
            bgcolor: theme.palette.background.paper,
            borderLeft: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <Box sx={{ px: 2.2, py: 1.8, borderBottom: `1px solid ${theme.palette.divider}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: theme.palette.text.primary }}>
              Notifications
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: theme.palette.text.secondary, mt: 0.2 }}>
              WhatsApp-style incident feed
            </Typography>
          </Box>
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
                  mb: 0.65,
                  mx: 0.8,
                  borderRadius: "10px",
                  border: row.is_read
                    ? `1px solid ${isLight ? "rgba(171,179,183,0.32)" : "rgba(91,64,62,0.2)"}`
                    : `1px solid ${tone.color}66`,
                  bgcolor: row.is_read
                    ? (isLight ? "rgba(234,239,241,0.72)" : "rgba(28,27,27,0.55)")
                    : (isLight ? "rgba(255,255,255,0.9)" : "rgba(38,36,36,0.9)"),
                  alignItems: "flex-start",
                  py: 1,
                }}
              >
                <ListItemIcon sx={{ minWidth: 44, mt: 0.1 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: tone.bubble,
                      color: tone.color,
                      border: `1px solid ${tone.color}44`,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {tone.icon}
                    </span>
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography sx={{ color: theme.palette.text.primary, fontSize: 12.8, fontWeight: 700 }} noWrap>
                        {row.title}
                      </Typography>
                      <Typography
                        sx={{
                          color: row.is_read ? theme.palette.text.secondary : tone.color,
                          fontSize: 9.5,
                          fontWeight: row.is_read ? 500 : 700,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTimeAgo(row.created_at)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: 11.3, mt: 0.35 }} noWrap>
                      {row.message}
                    </Typography>
                  }
                />
                {!row.is_read && (
                  <Box
                    sx={{
                      ml: 1,
                      mt: 1,
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: tone.color,
                      boxShadow: `0 0 8px ${tone.color}`,
                      flexShrink: 0,
                    }}
                  />
                )}
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
        <Box
          onClick={openFromSnackbar}
          sx={{
            minWidth: 320,
            maxWidth: 380,
            borderRadius: "12px",
            cursor: "pointer",
            border: isLight
              ? "1px solid rgba(171,179,183,0.45)"
              : "1px solid rgba(91,64,62,0.25)",
            boxShadow: isLight
              ? "0 12px 24px rgba(43,52,55,0.14)"
              : "0 16px 28px rgba(0,0,0,0.5)",
            bgcolor: isLight ? "#ffffff" : "#252526",
            color: isLight ? "#2b3437" : "#e5e2e1",
            px: 1.4,
            py: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: snackbarSeverity(snackbar?.type) === "error" ? "#3a1817" : "#17382f",
                color: snackbarSeverity(snackbar?.type) === "error" ? "#ff5451" : "#4edea3",
                border: `1px solid ${snackbarSeverity(snackbar?.type) === "error" ? "#ff545166" : "#4edea366"}`,
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {snackbarSeverity(snackbar?.type) === "error" ? "priority_high" : "chat"}
              </span>
            </Avatar>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 800, opacity: 0.75 }}>
                ROCKEFELLER CHAT ALERT
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 800 }} noWrap>
                {snackbar?.title}
              </Typography>
              {snackbar?.message && (
                <Typography sx={{ fontSize: 11, opacity: 0.9 }} noWrap>
                  {snackbar.message}
                </Typography>
              )}
            </Box>

            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                setSnackbar(null);
              }}
              size="small"
              sx={{ color: theme.palette.text.secondary }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
            </IconButton>
          </Box>
        </Box>
      </Snackbar>
    </>
  );
}
