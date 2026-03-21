import api from "./axios";

export const fetchWeather = (params = {}) =>
  api.get("/api/weather", { params }).then(r => r.data);

export const fetchWeatherByDistrict = (district) =>
  api.get(`/api/weather/${district}`).then(r => r.data);
