import api from "./axios";

export const fetchPredictionsSummary = () =>
  api.get("/api/predictions/summary").then((r) => r.data);

export const fetchZonePredictions = () =>
  api.get("/api/predictions/zones").then((r) => r.data);

export const fetchZonePredictionDetail = (zoneId) =>
  api.get(`/api/predictions/zones/${zoneId}`).then((r) => r.data);
