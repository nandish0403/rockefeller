import api from "./axios";

export const sendEmergencyBroadcast = (payload) =>
  api.post("/api/emergency/broadcast", payload).then((r) => r.data);
