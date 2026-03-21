import { useState, useEffect } from "react";
import { fetchZones } from "../../api/zones";

export function useMapData() {
  const [zones,   setZones]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState({
    district:   "",
    risk_level: "",
    status:     "",
  });

  useEffect(() => {
    setLoading(true);
    // Only send non-empty filters as query params
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    );
    fetchZones(params)
      .then(setZones)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);   // re-fetches every time a filter changes

  const updateFilter = (key, value) =>
    setFilters(f => ({ ...f, [key]: value }));

  const clearFilters = () =>
    setFilters({ district: "", risk_level: "", status: "" });

  return { zones, loading, error, filters, updateFilter, clearFilters };
}
