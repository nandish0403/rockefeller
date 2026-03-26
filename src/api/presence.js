import api from "./axios";

export const fetchMyPresence = () =>
  api.get("/api/presence/me").then((r) => r.data);

export const checkIn = (zoneId) =>
  api.patch("/api/presence/me/check-in", zoneId ? { zone_id: zoneId } : {}).then((r) => r.data);

export const checkOut = () =>
  api.patch("/api/presence/me/check-out").then((r) => r.data);

export const fetchHeadcount = (zoneId) =>
  api.get("/api/presence/headcount", { params: zoneId ? { zone_id: zoneId } : {} }).then((r) => r.data);

export const fetchRedAlertInside = () =>
  api.get("/api/presence/red-alert-inside").then((r) => r.data);
