import React from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider, Button, Grid, Chip,
} from '@mui/material';
import { Close as CloseIcon, OpenInNew, ReportProblem } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { RiskBadge } from '../common/RiskBadge';
import { formatDate } from '../../utils/formatUtils';

export const ZoneDetailsDrawer = ({ zone, open, onClose }) => {
  const navigate = useNavigate();

  if (!zone) return null;

  const infoItems = [
    { label: 'Risk Score', value: `${zone.riskScore}/100` },
    { label: 'Last Landslide', value: zone.lastLandslide ? formatDate(zone.lastLandslide) : 'None recorded' },
    { label: 'Recent Rainfall', value: `${zone.recentRainfall} mm (7d)` },
    { label: 'Blast Count (7d)', value: zone.blastCount7d },
    { label: 'Slope Angle', value: `${zone.slopeAngle}°` },
    { label: 'Soil Type', value: zone.soilType },
    { label: 'Status', value: zone.status },
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 380 },
          p: 0,
        },
      }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
            Zone Details
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.15rem', mb: 0.5 }}>
            {zone.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
            {zone.mineName} — {zone.district}
          </Typography>
          <RiskBadge level={zone.riskLevel} size="medium" />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={1.5}>
          {infoItems.map((item) => (
            <Grid item xs={6} key={item.label}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {item.value}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<OpenInNew />}
            onClick={() => navigate(`/zones/${zone.id}`)}
            fullWidth
          >
            View Full Details
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ReportProblem />}
            onClick={() => navigate('/field-report')}
            fullWidth
          >
            Report Issue
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ZoneDetailsDrawer;
