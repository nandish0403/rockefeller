import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, InputAdornment, IconButton
} from "@mui/material";
import { Visibility, VisibilityOff, Shield } from "@mui/icons-material";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
    <Box sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      bgcolor: "#0a0a0a",
      px: 2,
    }}>
      <Card sx={{ width: "100%", maxWidth: 420, bgcolor: "#141414", border: "1px solid #222" }}>
        <CardContent sx={{ p: 4 }}>

          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
            <Shield sx={{ color: "#e53935", fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="white">
              Rockefeller
            </Typography>
          </Box>

          <Typography variant="h6" color="white" fontWeight={600} mb={0.5}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Mine landslide risk monitoring
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type={showPass ? "text" : "password"}
              fullWidth
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(p => !p)} edge="end">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" }, mb: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Sign In"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#e53935" }}>
              Sign up
            </Link>
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
}
