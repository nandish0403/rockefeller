import api from "./axios";
import { API_BASE_URL } from "@/config/api";

export const fetchZoneSummary = (zoneId) =>
  api.post(`/api/groq/zones/${zoneId}/summary`).then((response) => response.data);

export const fetchAlertExplanation = (alertId) =>
  api.post(`/api/groq/alerts/${alertId}/explain`).then((response) => response.data);

export const streamZoneSummary = async (zoneId, onToken, onDone) => {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${API_BASE_URL}/api/groq/zones/${zoneId}/summary/stream`,
    {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || "Unable to stream summary");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventChunk of events) {
      const lines = eventChunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();

        if (payload === "[DONE]") {
          if (onDone) onDone();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          const nextToken = parsed?.token;
          if (nextToken && onToken) onToken(nextToken);
        } catch {
          // Ignore malformed partial chunks.
        }
      }
    }
  }

  if (onDone) onDone();
};