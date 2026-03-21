import { useState, useEffect } from "react";
import {
  Box, Typography, TextField, MenuItem, Button,
  Stack, Alert, CircularProgress, Card, CardContent, Snackbar,
} from "@mui/material";
import { CloudUpload, Send } from "@mui/icons-material";
import { fetchZones } from "../../api/zones";
import { submitCrackReport } from "../../api/crackReports";
import { submitReport } from "../../api/reports";
import { useAuth } from "../../context/AuthContext";

const CRACK_TYPES = ["Parallel Crack", "Tension Crack", "Shear Crack", "Settlement Crack"];
const UPLOAD_TYPES = ["crack_report", "field_report"];

export default function Upload() {
  const { currentUser } = useAuth();
  const [zones,   setZones]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState("");
  const [error,   setError]   = useState("");
  const [uploadType, setUploadType] = useState("crack_report");
  const [form, setForm] = useState({
    zone_id: "", crack_type: "", severity: "medium", remarks: "",
  });
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    fetchZones().then(setZones).catch(() => {});
  }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.zone_id) { setError("Please select a zone."); return; }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append("photo", photo);
      fd.append("reported_by", currentUser?.name || "Unknown");

      if (uploadType === "crack_report") await submitCrackReport(fd);
      else await submitReport(fd);

      setToast("Submitted successfully!");
      setForm({ zone_id: "", crack_type: "", severity: "medium", remarks: "" });
      setPhoto(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h5" fontWeight={700} color="white" mb={3}>
        Submit Report
      </Typography>

      <Card sx={{ bgcolor: "#141414", border: "1px solid #222" }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField select label="Report Type" value={uploadType}
                onChange={e => setUploadType(e.target.value)} fullWidth>
                <MenuItem value="crack_report">Crack Report</MenuItem>
                <MenuItem value="field_report">Field Report</MenuItem>
              </TextField>

              <TextField select label="Zone" name="zone_id" value={form.zone_id}
                onChange={handleChange} fullWidth required>
                <MenuItem value="">Select Zone</MenuItem>
                {zones.map(z => <MenuItem key={z.id} value={z.id}>{z.name} — {z.district}</MenuItem>)}
              </TextField>

              {uploadType === "crack_report" && (
                <TextField select label="Crack Type" name="crack_type" value={form.crack_type}
                  onChange={handleChange} fullWidth>
                  <MenuItem value="">Select Type</MenuItem>
                  {CRACK_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              )}

              <TextField select label="Severity" name="severity" value={form.severity}
                onChange={handleChange} fullWidth>
                {["low","medium","high","critical"].map(s => (
                  <MenuItem key={s} value={s} sx={{ textTransform: "capitalize" }}>{s}</MenuItem>
                ))}
              </TextField>

              <TextField label="Remarks" name="remarks" value={form.remarks}
                onChange={handleChange} fullWidth multiline rows={3} />

              {/* Photo upload */}
              <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
                {photo ? photo.name : "Upload Photo"}
                <input type="file" hidden accept="image/*"
                  onChange={e => setPhoto(e.target.files[0])} />
              </Button>

              <Button type="submit" variant="contained" size="large" disabled={loading}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send />}
                sx={{ bgcolor: "#e53935", "&:hover": { bgcolor: "#c62828" } }}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={!!toast} autoHideDuration={3000}
        onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
