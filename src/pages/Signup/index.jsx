import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, MenuItem,
} from "@mui/material";
import { Shield as ShieldIcon } from "@mui/icons-material";


const ROLES = [
  { value: "field_worker",    label: "Field Worker" },
  { value: "safety_officer",  label: "Safety Officer" },
  { value: "admin",           label: "Admin" },
];

const DISTRICTS = [
  "Nagpur", "Chandrapur", "Gadchiroli", "Yavatmal",
  "Amravati", "Bhandara", "Gondia", "Wardha",
];

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "",
    role: "field_worker", district: "",
  });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
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
      py: 4,
    }}>
      <Card sx={{ width: "100%", maxWidth: 460, bgcolor: "#141414", border: "1px solid #222" }}>
        <CardContent sx={{ p: 4 }}>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
            <ShieldIcon sx={{ color: "#e53935", fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="white">
              Rockefeller
            </Typography>
          </Box>

          <Typography variant="h6" color="white" fontWeight={600} mb={0.5}>
            Create account
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Register as a monitoring team member
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Full Name" name="name" fullWidth required
              value={form.name} onChange={handleChange} sx={{ mb: 2 }}
            />
            <TextField
              label="Email" name="email" type="email" fullWidth required
              value={form.email} onChange={handleChange} sx={{ mb: 2 }}
            />
            <TextField
              label="Password" name="password" type="password" fullWidth required
              value={form.password} onChange={handleChange} sx={{ mb: 2 }}
            />
            <TextField
              select label="Role" name="role" fullWidth required
              value={form.role} onChange={handleChange} sx={{ mb: 2 }}
            >
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="District" name="district" fullWidth
              value={form.district} onChange={handleChange} sx={{ mb: 3 }}
            >
              {DISTRICTS.map(d => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>

            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={loading}
              sx={{ bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" }, mb: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : "Create Account"}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#e53935" }}>Sign in</Link>
          </Typography>

        </CardContent>
      </Card>
    </Box>
  );
}
