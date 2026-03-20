import api from "./axios";

export const fetchZones = (params = {}) =>
  api.get("/api/zones", { params }).then((r) => r.data);

export const fetchZone = (id) =>
  api.get(`/api/zones/${id}`).then((r) => r.data);

export const updateZone = (id, data) =>
  api.patch(`/api/zones/${id}`, data).then((r) => r.data);
