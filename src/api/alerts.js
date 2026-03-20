import api from "./axios";

export const fetchAlerts = (params = {}) =>
  api.get("/api/alerts", { params }).then((r) => r.data);

export const fetchAlert = (id) =>
  api.get(`/api/alerts/${id}`).then((r) => r.data);

export const acknowledgeAlert = (id) =>
  api.patch(`/api/alerts/${id}/acknowledge`).then((r) => r.data);

export const resolveAlert = (id) =>
  api.patch(`/api/alerts/${id}/resolve`).then((r) => r.data);

export const createAlert = (data) =>
  api.post("/api/alerts", data).then((r) => r.data);
