import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress
} from "@mui/material";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f172a" }}>
      <Card sx={{ width: 400, bgcolor: "#1e293b", color: "white", borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1} color="white">
            GeoAlert
          </Typography>
          <Typography variant="body2" color="grey.400" mb={3}>
            Mine Safety & Landslide Risk Dashboard
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              required sx={{ mb: 2 }} variant="outlined"
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <TextField
              fullWidth label="Password" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              required sx={{ mb: 3 }} variant="outlined"
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading}
              sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" }, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
            </Button>
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading}
              sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" }, fontWeight: 700, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
            </Button>

            {/* ADD THIS */}
            <Button
              fullWidth variant="text"
              onClick={() => navigate("/signup")}
              sx={{ color: "#94a3b8", textTransform: "none" }}
            >
              Don't have an account? Sign Up
            </Button>


            
          </form>
          <Typography variant="caption" color="grey.500" mt={2} display="block" textAlign="center">
            admin@geoalert.com / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
