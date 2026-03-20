import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Badge, IconButton, Avatar, Chip } from '@mui/material';
import { Notifications as NotificationsIcon, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { alerts } from '../../data/alerts';

export const TopHeader = ({ onMenuClick, isMobile }) => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        bgcolor: '#0f172a',
        borderBottom: '1px solid #1e293b',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>

        {/* Left */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isMobile && (
            <IconButton color="inherit" onClick={onMenuClick} edge="start">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" fontWeight={700} color="white" noWrap>
            GeoAlert
          </Typography>
          <Typography variant="caption" color="grey.500" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Mine Safety Dashboard
          </Typography>
        </Box>

        {/* Right */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton color="inherit">
            <Badge badgeContent={activeAlertCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {currentUser ? (
            /* Logged in — show name + role + logout */
            <>
              <Avatar
                sx={{ width: 32, height: 32, bgcolor: '#ef4444', fontSize: '0.85rem', fontWeight: 700 }}
              >
                {currentUser.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" color="white" fontWeight={600} lineHeight={1.2}>
                  {currentUser.name}
                </Typography>
                <Typography variant="caption" color="grey.400" lineHeight={1}>
                  {currentUser.role?.replace('_', ' ')}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLogout}
                sx={{
                  color: '#94a3b8',
                  borderColor: '#334155',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#ef4444', color: '#ef4444' }
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            /* Not logged in — show Login + Sign Up */
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate('/login')}
                sx={{
                  color: 'white',
                  borderColor: '#334155',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { borderColor: '#ef4444', color: '#ef4444' }
                }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => navigate('/signup')}
                sx={{
                  bgcolor: '#ef4444',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': { bgcolor: '#dc2626' }
                }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Box>

      </Toolbar>
    </AppBar>
  );
};

export default TopHeader;
