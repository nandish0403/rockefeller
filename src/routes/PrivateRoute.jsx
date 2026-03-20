import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CircularProgress, Box } from "@mui/material";

export default function PrivateRoute({ children }) {
  const auth = useAuth();

  if (!auth || auth.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#0f172a" }}>
        <CircularProgress color="error" />
      </Box>
    );
  }

  return auth.currentUser ? children : <Navigate to="/login" replace />;
}
