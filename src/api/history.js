import api from "./axios";

export const fetchHistoricalEvents = (params = {}) =>
  api.get("/api/history", { params }).then((r) => r.data);
