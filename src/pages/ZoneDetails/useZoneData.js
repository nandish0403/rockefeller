import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { fetchZone } from "../../api/zones";
import { fetchAlerts } from "../../api/alerts";
import { fetchCrackReports } from "../../api/crackReports";
import { fetchBlastEvents } from "../../api/blastEvents";
import { fetchWeather } from "../../api/weather";

export function useZoneData() {
  const { id } = useParams();

  const [zone,         setZone]         = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [crackReports, setCrackReports] = useState([]);
  const [blastEvents,  setBlastEvents]  = useState([]);
  const [weather,      setWeather]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const loadZone = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetchZone(id)
      .then(setZone)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Load zone first, then all related data in parallel
    fetchZone(id)
      .then(z => {
        setZone(z);
        return Promise.all([
          fetchAlerts({ zone_id: id }),
          fetchCrackReports({ zone_id: id }),
          fetchBlastEvents({ zone_id: id }),
          fetchWeather({ district: z.district }).catch(() => []),
        ]);
      })
      .then(([a, c, b, w]) => {
        setAlerts(a       ?? []);
        setCrackReports(c ?? []);
        setBlastEvents(b  ?? []);
        setWeather(w      ?? []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  return {
    zone, alerts, crackReports, blastEvents, weather,
    loading, error, refetch: loadZone,
  };
}
