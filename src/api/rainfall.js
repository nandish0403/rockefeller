import api from "./axios";

export const fetchDistrictForecast = (district, daysAhead = 7) =>
  api.get(`/api/rainfall/forecast/${encodeURIComponent(district)}`, { params: { days_ahead: daysAhead } }).then((r) => r.data);

export const fetchZoneForecastFlags = (daysAhead = 7) =>
  api.get("/api/rainfall/zone-risk-flags", { params: { days_ahead: daysAhead } }).then((r) => r.data);
