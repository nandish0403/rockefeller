import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CircularProgress, Box } from "@mui/material";

export default function PrivateRoute({ children, requiredRole = null }) {
  const auth = useAuth();

  // Still checking token with /api/auth/me
  if (!auth || auth.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#0a0a0a" }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  // Not logged in → go to login
  if (!auth.currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Role check — if page needs admin but user is field_worker → go to dashboard
  if (requiredRole && auth.currentUser.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
