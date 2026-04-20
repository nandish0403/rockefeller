import api from "./axios";

export const getVapidPublicKey = () =>
  api.get("/api/push/vapid-public-key").then((r) => r.data?.public_key || null);

export const subscribePush = (subscription) =>
  api.post("/api/push/subscribe", { subscription }).then((r) => r.data);
