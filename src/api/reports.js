import api from "./axios";

export const fetchReports = (params = {}) =>
  api.get("/api/reports", { params }).then(r => r.data);

export const fetchReportById = (id) =>
  api.get(`/api/reports/${id}`).then(r => r.data);

export const submitReport = (formData) =>
  api.post("/api/reports", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);

export const generateReportAIDraft = (payload) =>
  api.post("/api/reports/generate-ai-draft", payload).then(r => r.data);
