import api from "./axios";

export const fetchBlastEvents = (params = {}) =>
  api.get("/api/blast-events", { params }).then(r => r.data);

export const createBlastEvent = (data) =>
  api.post("/api/blast-events", data).then(r => r.data);
