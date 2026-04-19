function normalizePoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    const lat = Number(point[0]);
    const lng = Number(point[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
    return null;
  }

  if (point && typeof point === "object") {
    const lat = Number(point.lat ?? point.latitude);
    const lng = Number(point.lng ?? point.lon ?? point.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }
  }

  return null;
}

export function normalizeLatLngs(points) {
  if (!Array.isArray(points)) return [];
  return points.map(normalizePoint).filter(Boolean);
}

export function getZoneCoordinates(zone) {
  return normalizeLatLngs(zone?.latlngs || zone?.coordinates || []);
}
