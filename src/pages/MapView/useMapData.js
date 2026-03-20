import { useMemo, useState, useEffect, useCallback } from 'react';
import { fetchZones } from '../../api/zones';

export const useMapData = () => {
  const [allZones, setAllZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    districts: [],
    mineNames: [],
    riskLevels: [],
    soilTypes: [],
  });
  const [selectedZone, setSelectedZone] = useState(null);

  useEffect(() => {
    fetchZones()
      .then(setAllZones)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const districts = useMemo(() => [...new Set(allZones.map((z) => z.district))], [allZones]);
  const mineNames = useMemo(() => [...new Set(allZones.map((z) => z.mine_name))], [allZones]);
  const soilTypes = useMemo(() => [...new Set(allZones.map((z) => z.soil_type))], [allZones]);
  const riskLevels = ['green', 'yellow', 'orange', 'red'];

  const filteredZones = useMemo(() => {
    return allZones.filter((z) => {
      if (filters.districts.length && !filters.districts.includes(z.district)) return false;
      if (filters.mineNames.length && !filters.mineNames.includes(z.mine_name)) return false;
      if (filters.riskLevels.length && !filters.riskLevels.includes(z.risk_level)) return false;
      if (filters.soilTypes.length && !filters.soilTypes.includes(z.soil_type)) return false;
      return true;
    });
  }, [filters, allZones]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ districts: [], mineNames: [], riskLevels: [], soilTypes: [] });
  }, []);

  return {
    zones: filteredZones,
    allZones,
    filters,
    updateFilter,
    clearFilters,
    selectedZone,
    setSelectedZone,
    filterOptions: { districts, mineNames, soilTypes, riskLevels },
    loading,
  };
};

export default useMapData;
