import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { fetchAlerts } from "../../api/alerts";
import {
  AppBar, Toolbar, IconButton, Typography, Badge,
  Avatar, Box, Menu, MenuItem, Divider, Tooltip,
} from "@mui/material";
import { Menu as MenuIcon, Notifications, Logout, Person } from "@mui/icons-material";

export const TopHeader = ({ onMenuClick, isMobile }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetchAlerts({ status: "active" })
      .then(data => setAlertCount(data.length))
      .catch(() => setAlertCount(0));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: "#141414", borderBottom: "1px solid #222", boxShadow: "none" }}>
      <Toolbar>
        {isMobile && (
          <IconButton color="inherit" edge="start" onClick={onMenuClick} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
        )}
        <Typography variant="h6" fontWeight={700} color="white" sx={{ flexGrow: 1 }}>
          Rockefeller
        </Typography>

        {/* Active alerts badge */}
        <Tooltip title={`${alertCount} active alerts`}>
          <IconButton color="inherit" onClick={() => navigate("/alerts")}>
            <Badge badgeContent={alertCount} color="error">
              <Notifications />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* User menu */}
        <IconButton onClick={e => setAnchorEl(e.currentTarget)} sx={{ ml: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#e53935", fontSize: 14 }}>
            {currentUser?.name?.[0]?.toUpperCase() || "U"}
          </Avatar>
        </IconButton>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>{currentUser?.name}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "capitalize" }}>
              {currentUser?.role?.replace("_", " ")}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => { navigate("/profile"); setAnchorEl(null); }}>
            <Person fontSize="small" sx={{ mr: 1 }} /> Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
