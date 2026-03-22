import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const ROLES = [
  { key: "field_worker",   label: "Field Worker",   sub: "Ground Ops",        icon: "engineering" },
  { key: "safety_officer", label: "Safety Officer", sub: "Inspection",        icon: "safety_check" },
  { key: "admin",          label: "Admin",          sub: "Systems Control",   icon: "admin_panel_settings" },
];

const DISTRICTS = [
  "Ratnagiri","Sindhudurg","Raigad","Pune","Nagpur",
  "Nashik","Aurangabad","Kolhapur","Satara","Solapur",
];

const ZONES = [
  "Western Ridge B-12","Deep Core Sector 4","Coastal Buffer Zone",
  "Eastern Quarry 7","Northern Pit Alpha","Southern Basin 3",
];

// Password strength helper
function getStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  const map = [
    { label: "Too short",  color: "#ff5451" },
    { label: "Weak",       color: "#ff5451" },
    { label: "Fair",       color: "#ffb95f" },
    { label: "Good",       color: "#ffb3ad" },
    { label: "Strong",     color: "#4edea3" },
  ];
  return { score, ...map[score] };
}

export default function SignupPage() {
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [role,    setRole]    = useState("field_worker");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    district: "", zone_assigned: "", worker_id: "", phone: "",
  });

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const strength = getStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("Name, email and password are required."); return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match."); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:8000/api/auth/register", {
        name:          form.name,
        email:         form.email,
        password:      form.password,
        role,
        district:      form.district      || null,
        zone_assigned: form.zone_assigned || null,
        worker_id:     form.worker_id     || null,
        phone:         form.phone         || null,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err?.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0e0e0e",
      fontFamily: "Inter, sans-serif",
      overflowX: "hidden",
      paddingBottom: 80,
      position: "relative",
    }}>

      {/* ── Topo bg ── */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.3,
        pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' viewBox='0 0 1000 1000'%3E%3Cpath d='M0 200c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 400c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 600c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 800c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20' stroke='%23ffb3ad' stroke-width='0.5' fill='none' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: "cover",
        animation: "driftBg 60s linear infinite",
      }} />

      {/* ── Glow ── */}
      <div style={{
        position: "fixed", top: "30%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 600, height: 600,
        background: "rgba(255,179,173,0.04)",
        borderRadius: "50%", filter: "blur(100px)",
        pointerEvents: "none", zIndex: 0,
        animation: "glowPulse 4s ease-in-out infinite",
      }} />

      <main style={{
        position: "relative", zIndex: 10,
        maxWidth: 900, margin: "0 auto",
        padding: "48px 24px 40px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* ── Glass card ── */}
        <div style={{
          background: "rgba(32,31,31,0.7)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(91,64,62,0.15)",
          borderRadius: 4,
          padding: "40px 48px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          position: "relative", overflow: "hidden",
        }}>

          {/* Card corner accent */}
          <div style={{
            position: "absolute", top: 0, right: 0,
            width: 200, height: 200,
            background: "radial-gradient(circle at top right, rgba(255,179,173,0.04), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* ── Branding ── */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              display: "inline-flex", alignItems: "center",
              gap: 12, marginBottom: 20,
              animation: "floatIcon 3s ease-in-out infinite",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 2,
                background: "linear-gradient(135deg, #ffb3ad, #ff5451)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 16px rgba(255,179,173,0.3)",
              }}>
                <span className="material-symbols-outlined"
                  style={{ color: "#68000a", fontSize: 22,
                    fontVariationSettings: "'FILL' 1" }}>
                  mountain_flag
                </span>
              </div>
              <span style={{
                fontSize: 22, fontWeight: 800,
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: "#e5e2e1",
              }}>Rockefeller Mine</span>
            </div>
            <h1 style={{
              fontSize: 32, fontWeight: 700, color: "#e5e2e1",
              margin: "0 0 8px", letterSpacing: "-0.03em",
            }}>Create Your Account</h1>
            <p style={{
              fontSize: 10, color: "#e4beba", opacity: 0.7,
              textTransform: "uppercase", letterSpacing: "0.2em",
              fontWeight: 300, margin: 0,
            }}>Join the Maharashtra Mine Safety Network</p>
          </div>

          {/* ── Success banner ── */}
          <div style={{
            overflow: "hidden",
            maxHeight: success ? 60 : 0,
            opacity: success ? 1 : 0,
            marginBottom: success ? 24 : 0,
            transition: "all 0.4s ease",
          }}>
            <div style={{
              background: "rgba(78,222,163,0.1)",
              border: "1px solid rgba(78,222,163,0.3)",
              borderRadius: 2, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 12, color: "#4edea3",
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
              Account created! Redirecting to login...
            </div>
          </div>

          {/* ── Error ── */}
          <div style={{
            overflow: "hidden",
            maxHeight: error ? 60 : 0,
            opacity: error ? 1 : 0,
            marginBottom: error ? 24 : 0,
            transition: "all 0.3s ease",
          }}>
            <div style={{
              background: "rgba(255,84,81,0.1)",
              border: "1px solid rgba(255,84,81,0.3)",
              borderRadius: 2, padding: "10px 14px",
              fontSize: 11, color: "#ff5451",
            }}>⚠ {error}</div>
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Role selector ── */}
            <section style={{ marginBottom: 40 }}>
              <label style={{
                display: "block", fontSize: 10, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.2em",
                color: "#e4beba", marginBottom: 20,
              }}>Select Your Designation</label>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}>
                {ROLES.map(r => (
                  <div key={r.key}
                    onClick={() => setRole(r.key)}
                    style={{
                      padding: "20px 16px", borderRadius: 4,
                      cursor: "pointer", textAlign: "center",
                      transition: "all 0.25s",
                      background: role === r.key ? "#2a2a2a" : "#201f1f",
                      border: role === r.key
                        ? "1px solid rgba(255,179,173,0.4)"
                        : "1px solid rgba(91,64,62,0.15)",
                      boxShadow: role === r.key
                        ? "0 0 20px rgba(255,179,173,0.1)"
                        : "none",
                      transform: role === r.key ? "translateY(-2px)" : "none",
                    }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 36, display: "block", marginBottom: 12,
                      color: role === r.key ? "#ffb3ad" : "#e4beba",
                      fontVariationSettings: role === r.key ? "'FILL' 1" : "'FILL' 0",
                      transition: "all 0.25s",
                      filter: role === r.key
                        ? "drop-shadow(0 0 8px rgba(255,179,173,0.4))"
                        : "none",
                    }}>{r.icon}</span>
                    <p style={{
                      fontSize: 12, fontWeight: 700,
                      color: "#e5e2e1", margin: "0 0 4px",
                    }}>{r.label}</p>
                    <p style={{
                      fontSize: 9, color: "#e4beba", opacity: 0.6,
                      textTransform: "uppercase", letterSpacing: "0.1em", margin: 0,
                    }}>{r.sub}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Identity fields ── */}
            <section style={{ marginBottom: 40 }}>
              <div style={{
                borderBottom: "1px solid rgba(91,64,62,0.15)",
                paddingBottom: 10, marginBottom: 24,
              }}>
                <h2 style={{
                  fontSize: 11, fontWeight: 700, color: "#ffb3ad",
                  textTransform: "uppercase", letterSpacing: "0.2em", margin: 0,
                }}>Identity Details</h2>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "20px 32px",
              }}>
                <SField label="Full Name" type="text"
                  value={form.name} onChange={set("name")}
                  placeholder="e.g. Rahul Sharma" />

                <SField label="Email Address" type="email"
                  value={form.email} onChange={set("email")}
                  placeholder="official@rockefeller.com" />

                {/* Password with strength */}
                <div>
                  <SField label="Password" type="password"
                    value={form.password} onChange={set("password")}
                    placeholder="••••••••" />
                  <div style={{
                    marginTop: 8, height: 3,
                    background: "#201f1f", borderRadius: 99, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${(strength.score / 4) * 100}%`,
                      background: strength.color,
                      transition: "width 0.3s ease, background 0.3s ease",
                    }} />
                  </div>
                  {form.password && (
                    <p style={{
                      fontSize: 9, color: strength.color, marginTop: 4,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>{strength.label} Security</p>
                  )}
                </div>

                <SField label="Confirm Password" type="password"
                  value={form.confirm} onChange={set("confirm")}
                  placeholder="••••••••"
                  error={form.confirm && form.password !== form.confirm
                    ? "Passwords don't match" : ""}
                />
              </div>
            </section>

            {/* ── Role-specific fields ── */}
            <section style={{ marginBottom: 40 }}>
              <div style={{
                borderBottom: "1px solid rgba(91,64,62,0.15)",
                paddingBottom: 10, marginBottom: 24,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span className="material-symbols-outlined"
                  style={{ color: "#ffb3ad", fontSize: 16 }}>
                  {ROLES.find(r => r.key === role)?.icon}
                </span>
                <h2 style={{
                  fontSize: 11, fontWeight: 700, color: "#ffb3ad",
                  textTransform: "uppercase", letterSpacing: "0.2em", margin: 0,
                }}>
                  {ROLES.find(r => r.key === role)?.label} Details
                </h2>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: "20px 32px",
              }}>
                {/* District dropdown */}
                <div>
                  <label style={labelStyle}>Assigned District</label>
                  <select value={form.district} onChange={set("district")}
                    style={inputStyle}>
                    <option value="">Select district...</option>
                    {DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Zone dropdown */}
                <div>
                  <label style={labelStyle}>Assigned Mine / Zone</label>
                  <select value={form.zone_assigned} onChange={set("zone_assigned")}
                    style={inputStyle}>
                    <option value="">Select zone...</option>
                    {ZONES.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                {/* Worker ID — only for field_worker */}
                {role === "field_worker" && (
                  <SField label="Worker ID" type="text"
                    value={form.worker_id} onChange={set("worker_id")}
                    placeholder="RK-9921-X" />
                )}

                <SField label="Contact Number" type="tel"
                  value={form.phone} onChange={set("phone")}
                  placeholder="+91 XXXXX XXXXX" />
              </div>
            </section>

            {/* ── Submit ── */}
            <button type="submit" disabled={loading || success}
              style={{
                width: "100%", padding: "16px 0",
                background: success
                  ? "linear-gradient(135deg, #4edea3, #00a572)"
                  : loading
                    ? "#3a3939"
                    : "linear-gradient(135deg, #ffb3ad, #ff5451)",
                color: success ? "#002113" : loading ? "#e4beba" : "#68000a",
                border: "none", borderRadius: 2,
                fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.2em",
                cursor: loading || success ? "not-allowed" : "pointer",
                fontFamily: "Inter",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                transition: "all 0.3s",
                boxShadow: loading ? "none" : "0 4px 24px rgba(255,179,173,0.2)",
              }}
              onMouseEnter={e => { if (!loading && !success) e.target.style.transform = "scale(1.005)"; }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
              onMouseDown={e =>  { if (!loading && !success) e.target.style.transform = "scale(0.99)"; }}
              onMouseUp={e =>    { e.target.style.transform = "scale(1)"; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 13, height: 13,
                    border: "2px solid rgba(228,190,186,0.4)",
                    borderTopColor: "#e4beba", borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  CREATING ACCOUNT...
                </>
              ) : success ? "✓ ACCOUNT CREATED" : "Create Account & Get Started"}
            </button>
          </form>

          {/* ── Bottom actions ── */}
          <div style={{
            marginTop: 40, paddingTop: 28,
            borderTop: "1px solid rgba(91,64,62,0.15)",
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 20,
          }}>
            <span onClick={() => navigate("/login")} style={{
              fontSize: 11, color: "#e4beba",
              cursor: "pointer", display: "flex",
              alignItems: "center", gap: 6,
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              Already have an account?{" "}
              <span style={{ color: "#ffb3ad", fontWeight: 700 }}>Sign In</span>
            </span>

            {/* Partner logos */}
            <div style={{
              display: "flex", alignItems: "center", gap: 24,
              opacity: 0.35, filter: "grayscale(1)",
              transition: "all 0.5s",
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "0.35"; e.currentTarget.style.filter = "grayscale(1)"; }}
            >
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjQgZatl6wULx6Ky_GuhR5yQ3JImPU2U2Q3mRs3igcG3GValX7T2_uzPtQcqOTTSjLkS2ggcjH7v1mUMSxsolrz8pb_5515Z4gUgGSUcUavgCIAMGwIKg3RO-F6a4XkxT-WqA2JOckvs_zSYUNWjyYvmXzy0TQ8LbHPUVD-qA584x3dJ2UMy16n7Li16O_ItwQtJcir6MuuHSY8xBckTV3HdRGF0pkCOTIM6NNjlxHSUbuueUiwPYDRdDGTX39H-6zl-JLf_ffgEQ"
                alt="Maharashtra" style={{ height: 36, objectFit: "contain" }} />
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAo6_6alZMfe-WPBR9wArewy_sM_-01AycnoPsZ8jxWFW9NhMpbmcQ6SiWf6tb1TgBSbJ0g7WFKPEjxN-QTjSRh2mT7-M_K3CCYAojsD-WqeKwoH85tbQtxS4zdkKEZt6Y9XN3RI29lYCTSwtQuO0umbSjTqvsmZfzZJ0cjNsj3FdSQHjz1_EUlPFXHutL5LeHyUQGn6Qjh6eeOQdUjJ2Le60TjNN2sGdXWdv97UTd6c7_tUUtAAQ3HmO90uR1xpdAnxBAea3vv6ss"
                alt="Mine Safety" style={{ height: 36, objectFit: "contain" }} />
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        position: "fixed", bottom: 0, width: "100%", zIndex: 50,
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "16px 48px",
        background: "linear-gradient(to top, rgba(14,14,14,0.95) 60%, transparent)",
        flexWrap: "wrap", gap: 12,
      }}>
        <span style={{ fontSize: 9, color: "#5b403e",
          textTransform: "uppercase", letterSpacing: "0.1em" }}>
          © 2025 ROCKEFELLER GEOSPATIAL. ALL RIGHTS RESERVED.
        </span>
        <div style={{ display: "flex", gap: 24 }}>
          {["Privacy Policy", "Terms of Service", "System Status"].map(l => (
            <span key={l} style={{ fontSize: 9, color: "#5b403e",
              textTransform: "uppercase", letterSpacing: "0.08em",
              cursor: "pointer", transition: "color 0.2s" }}
              onMouseEnter={e => e.target.style.color = "#e4beba"}
              onMouseLeave={e => e.target.style.color = "#5b403e"}>
              {l}
            </span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes floatIcon { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes glowPulse { 0%,100% { opacity:1; transform:translate(-50%,-50%) scale(1); } 50% { opacity:0.5; transform:translate(-50%,-50%) scale(1.1); } }
        @keyframes driftBg   { from { background-position: 0 0; } to { background-position: 100px 100px; } }
        input::placeholder, select::placeholder { color: rgba(228,190,186,0.2); }
        select option { background: #1c1b1b; color: #e5e2e1; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #0e0e0e inset !important;
          -webkit-text-fill-color: #e5e2e1 !important;
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ── Shared input component ────────────────────────────────────
function SField({ label, type, value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          borderBottom: `1px solid ${
            error ? "#ff5451" : focused ? "#ffb3ad" : "rgba(91,64,62,0.3)"
          }`,
          boxShadow: focused ? "0 1px 0 #ffb3ad" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      />
      {error && (
        <p style={{ fontSize: 9, color: "#ff5451",
          margin: "4px 0 0", letterSpacing: "0.05em" }}>{error}</p>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 9, fontWeight: 500,
  textTransform: "uppercase", letterSpacing: "0.12em",
  color: "#e4beba", marginBottom: 8,
};

const inputStyle = {
  width: "100%", background: "#0e0e0e",
  border: "none", borderBottom: "1px solid rgba(91,64,62,0.3)",
  padding: "11px 14px", color: "#e5e2e1", fontSize: 13,
  fontFamily: "Inter", outline: "none", borderRadius: 0,
  appearance: "none", WebkitAppearance: "none",
};
