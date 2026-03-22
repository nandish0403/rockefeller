import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function PrivateRoute({ children, requiredRole }) {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return (
    <Box sx={{
      minHeight: "100vh", bgcolor: "#131313",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2,
    }}>
      <CircularProgress sx={{ color: "#ffb3ad" }} size={32} />
      <Typography sx={{ color: "#e4beba", fontSize: 12,
        letterSpacing: "0.1em", fontWeight: 300 }}>
        AUTHENTICATING...
      </Typography>
    </Box>
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  // Optional role guard
  if (requiredRole && currentUser.role !== requiredRole)
    return <Navigate to="/dashboard" replace />;

  return children;
}
