const rawApiBaseUrl = String(import.meta.env.VITE_API_URL || "").trim();
const fallbackApiBaseUrl =
	String(import.meta.env.VITE_API_FALLBACK_URL || "").trim() ||
	(import.meta.env.PROD
		? "https://rockefeller-production.up.railway.app"
		: "http://localhost:8000");

// Prevent accidental double slashes in requests like //api/auth/login.
export const API_BASE_URL = (rawApiBaseUrl || fallbackApiBaseUrl).replace(/\/+$/, "");
