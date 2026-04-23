import api from "./axios";

export const fetchNotifications = (params = {}) =>
  api.get("/api/notifications", { params }).then((r) => r.data);

export const markNotificationRead = (id) =>
  api.patch(`/api/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
  api.patch("/api/notifications/read-all").then((r) => r.data);

export const adminBroadcastNotification = (payload) =>
  api.post("/api/notifications/admin/broadcast", payload).then((r) => r.data);
