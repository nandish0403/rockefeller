import React from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import { Typography } from '@mui/material';
import { getRiskColor } from '../../utils/riskUtils';
import { getZoneCoordinates } from '../../utils/zoneCoordinates';

export const ZonePolygon = ({ zone, onClick }) => {
  const color = getRiskColor(zone.riskLevel);
  const points = getZoneCoordinates(zone);

  if (points.length < 3) return null;

  return (
    <Polygon
      positions={points}
      pathOptions={{
        color: color,
        fillColor: color,
        fillOpacity: 0.45,
        weight: 2.5,
      }}
      eventHandlers={{
        click: () => onClick?.(zone),
        mouseover: (e) => {
          e.target.setStyle({ fillOpacity: 0.7, weight: 3 });
        },
        mouseout: (e) => {
          e.target.setStyle({ fillOpacity: 0.45, weight: 2.5 });
        },
      }}
    >
      <Tooltip sticky>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {zone.name}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          {zone.mineName} — {zone.district}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block' }}>
          Risk Score: {zone.riskScore}
        </Typography>
      </Tooltip>
    </Polygon>
  );
};

export default ZonePolygon;
