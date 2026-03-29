import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Dialog, Typography } from "@mui/material";

import { useAuth } from "./AuthContext";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import { getVapidPublicKey, subscribePush } from "../api/push";
import { API_BASE_URL } from "@/config/api";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  snackbar: null,
  isDrawerOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

const PUSH_SENT_KEY_PREFIX = "push_sub_sent";

function toUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationProvider({ children }) {
  const { currentUser, token } = useAuth();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [snackbar, setSnackbar] = useState(null);
  const [emergencyModal, setEmergencyModal] = useState(null);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      const rows = await fetchNotifications();
      setNotifications(rows || []);
    } catch {
      setNotifications([]);
    }
  }, [token]);

  const closeSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      // Prevent onclose from scheduling reconnect when we intentionally close.
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (!currentUser?.id || !token) return;

    // Clean old socket (if any) without triggering reconnect loops.
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const wsBaseUrl = API_BASE_URL.replace(/^http/i, "ws");
    const ws = new WebSocket(`${wsBaseUrl}/ws/${currentUser.id}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed?.event === "emergency_broadcast" && parsed?.payload) {
          setEmergencyModal(parsed.payload);
        }

        if (parsed?.event !== "notification" || !parsed?.notification) return;

        setNotifications((prev) => [parsed.notification, ...prev]);
        setSnackbar({
          id: parsed.notification.id,
          title: parsed.notification.title,
          message: parsed.notification.message,
        });
      } catch {
        // Ignore malformed websocket messages.
      }
    };

    ws.onclose = () => {
      if (!currentUser?.id) return;
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connectSocket();
        }, 5000);
      }
    };
  }, [closeSocket, currentUser?.id, token]);

  const registerPush = useCallback(async () => {
    if (!currentUser?.id || !token) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }

    try {
      const swReg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const key = await getVapidPublicKey();
      if (!key) return;

      const sentStorageKey = `${PUSH_SENT_KEY_PREFIX}:${currentUser.id}`;
      if (localStorage.getItem(sentStorageKey) === "1") return;

      const existing = await swReg.pushManager.getSubscription();
      const subscription =
        existing ||
        (await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(key),
        }));

      await subscribePush(subscription);
      localStorage.setItem(sentStorageKey, "1");
    } catch {
      // Push is optional; websocket notifications still work.
    }
  }, [currentUser?.id, token]);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // no-op
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!currentUser?.id || !token) {
      closeSocket();
      return;
    }
    connectSocket();
    registerPush();
    return () => closeSocket();
  }, [closeSocket, connectSocket, registerPush, currentUser?.id, token]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      snackbar,
      setSnackbar,
      emergencyModal,
      dismissEmergencyModal: () => setEmergencyModal(null),
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      markRead,
      markAllRead,
      reloadNotifications: loadNotifications,
    }),
    [emergencyModal, isDrawerOpen, loadNotifications, markAllRead, markRead, notifications, snackbar, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      <Dialog fullScreen open={!!emergencyModal} onClose={() => setEmergencyModal(null)}>
        <Box
          sx={{
            minHeight: "100vh",
            bgcolor: "#2a0505",
            background: "radial-gradient(circle at top, rgba(255,84,81,0.24), #180303 70%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            px: 3,
            textAlign: "center",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 88, color: "#ff5451" }}>
            warning
          </span>
          <Typography sx={{ fontSize: { xs: 30, md: 48 }, fontWeight: 900, letterSpacing: "0.04em", mb: 1.2 }}>
            EMERGENCY ALERT
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 26 }, fontWeight: 700, color: "#ffb3ad", mb: 1 }}>
            {emergencyModal?.zone_name || "Assigned Zone"}
          </Typography>
          <Typography sx={{ maxWidth: 920, fontSize: { xs: 16, md: 22 }, color: "#ffe6e6", lineHeight: 1.6 }}>
            {emergencyModal?.message || "Emergency protocol activated. Follow safety instructions immediately."}
          </Typography>

          <Alert severity="error" variant="filled" sx={{ mt: 3, bgcolor: "#a31212", fontWeight: 700 }}>
            Proceed to safe muster point and confirm your check-out status.
          </Alert>

          <Button
            variant="contained"
            onClick={() => setEmergencyModal(null)}
            sx={{ mt: 4, bgcolor: "#ff5451", color: "#240000", fontWeight: 800, px: 4, py: 1.2 }}
          >
            I UNDERSTAND
          </Button>
        </Box>
      </Dialog>
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
