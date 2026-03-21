import api from "./axios";

export const fetchCrackReports = (params = {}) =>
  api.get("/api/crack-reports", { params }).then(r => r.data);

export const submitCrackReport = (formData) =>
  api.post("/api/crack-reports", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);

export const updateCrackReport = (id, data) =>
  api.patch(`/api/crack-reports/${id}`, data).then(r => r.data);
