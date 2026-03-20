import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, CircularProgress, MenuItem
} from "@mui/material";

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "field_worker", district: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axios.post("http://localhost:8000/api/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f172a" }}>
      <Card sx={{ width: 420, bgcolor: "#1e293b", color: "white", borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={1} color="white">Create Account</Typography>
          <Typography variant="body2" color="grey.400" mb={3}>GeoAlert — Mine Safety Dashboard</Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Full Name" name="name" value={form.name}
              onChange={handleChange} required sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <TextField
              fullWidth label="Email" name="email" type="email" value={form.email}
              onChange={handleChange} required sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <TextField
              fullWidth label="Password" name="password" type="password" value={form.password}
              onChange={handleChange} required sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <TextField
              fullWidth select label="Role" name="role" value={form.role}
              onChange={handleChange} sx={{ mb: 2 }}
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
              SelectProps={{ MenuProps: { PaperProps: { sx: { bgcolor: "#1e293b", color: "white" } } } }}
            >
              <MenuItem value="field_worker">Field Worker</MenuItem>
              <MenuItem value="safety_officer">Safety Officer</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
            <TextField
              fullWidth label="District" name="district" value={form.district}
              onChange={handleChange} sx={{ mb: 3 }}
              InputLabelProps={{ style: { color: "#94a3b8" } }}
              InputProps={{ style: { color: "white" } }}
            />
            <Button
              fullWidth type="submit" variant="contained" size="large"
              disabled={loading}
              sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" }, fontWeight: 700, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Create Account"}
            </Button>
            <Button
              fullWidth variant="text"
              onClick={() => navigate("/login")}
              sx={{ color: "#94a3b8", textTransform: "none" }}
            >
              Already have an account? Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
