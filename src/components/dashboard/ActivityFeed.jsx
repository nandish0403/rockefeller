import React from "react";
import {
  List, ListItem, ListItemIcon, ListItemText, Typography, Box,
} from "@mui/material";
import {
  Description as ReportIcon,
  Explore as BlastIcon,
  NotificationsActive as AlertIcon,
  SwapVert as ZoneIcon,
} from "@mui/icons-material";
import { brandTokens } from "../../theme";
import { formatTimeAgo } from "../../utils/formatUtils";

const ICON_MAP = {
  report: { icon: <ReportIcon />, color: brandTokens.brand?.accent  ?? "#2196f3" },
  blast:  { icon: <BlastIcon />,  color: brandTokens.risk?.orange   ?? "#ff9800" },
  alert:  { icon: <AlertIcon />,  color: brandTokens.risk?.yellow   ?? "#ffeb3b" },
  zone:   { icon: <ZoneIcon />,   color: brandTokens.risk?.red      ?? "#f44336" },
};

export const ActivityFeed = ({ items = [] }) => {   // ✅ default to [] — never undefined
  if (!items.length) {
    return (
      <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: "center" }}>
        No recent activity
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {items.map((item, i) => {
        const config = ICON_MAP[item.type] || ICON_MAP.alert;
        return (
          <ListItem key={i} sx={{ px: 0, borderBottom: "1px solid #1a1a1a" }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Box sx={{ color: config.color }}>{config.icon}</Box>
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" color="white" fontWeight={500}>
                  {item.title}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {item.subtitle}
                </Typography>
              }
            />
            {item.time && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, whiteSpace: "nowrap" }}>
                {formatTimeAgo(item.time)}
              </Typography>
            )}
          </ListItem>
        );
      })}
    </List>
  );
};

export default ActivityFeed;
