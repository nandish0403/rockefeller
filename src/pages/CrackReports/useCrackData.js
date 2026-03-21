import { useState, useEffect } from "react";
import { fetchCrackReports } from "../../api/crackReports";

export function useCrackData(filters = {}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    );
    fetchCrackReports(params)
      .then(setReports)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  return { reports, loading, error };
}
