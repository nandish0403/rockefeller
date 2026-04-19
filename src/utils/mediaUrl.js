import { API_BASE_URL } from "@/config/api";

const ABSOLUTE_URL_RE = /^https?:\/\//i;

export function toMediaUrl(path) {
  if (!path) return "";
  if (ABSOLUTE_URL_RE.test(path)) return path;
  if (!API_BASE_URL) return path;

  const normalized = String(path).startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}
