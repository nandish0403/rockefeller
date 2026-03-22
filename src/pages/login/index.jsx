import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [mode,      setMode]      = useState("standard");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [mounted,   setMounted]   = useState(false);
  const [focusedField, setFocused] = useState(null);

  const isAdmin = mode === "admin";

  // Trigger mount animation
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      if (user.role === "admin") navigate("/admin");
      else navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#0e0e0e",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      overflowX: "hidden",
      // ✅ paddingBottom clears fixed footer
      paddingTop: 24,
      paddingBottom: 120,
      position: "relative",
    }}>

      {/* ── Topographic background ── */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.35,
        pointerEvents: "none", zIndex: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000' viewBox='0 0 1000 1000'%3E%3Cpath d='M0 200c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 400c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 600c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20M0 800c50 0 100-20 150-20s100 20 150 20 100-20 150-20 100 20 150 20 100-20 150-20 100 20 150 20' stroke='%23ffb3ad' stroke-width='0.5' fill='none' opacity='0.08'/%3E%3C/svg%3E")`,
        backgroundSize: "cover",
        animation: "driftBg 60s linear infinite",
      }} />

      {/* ── Pulsing atmospheric glow ── */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: isAdmin
          ? "rgba(59,130,246,0.05)"
          : "rgba(255,179,173,0.06)",
        borderRadius: "50%", filter: "blur(100px)",
        pointerEvents: "none", zIndex: 0,
        animation: "glowPulse 4s ease-in-out infinite",
        transition: "background 0.6s",
      }} />

      {/* ── Main ── */}
      <main style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 480,
        padding: "0 24px",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* ── Logo ── */}
        <header style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", marginBottom: 32, gap: 8,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            animation: "floatIcon 3s ease-in-out infinite",
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 46, color: "#ffb3ad",
              fontVariationSettings: "'FILL' 1",
              filter: "drop-shadow(0 0 12px rgba(255,179,173,0.4))",
            }}>landslide</span>
            <h1 style={{
              fontSize: 26, fontWeight: 800,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "#e5e2e1", margin: 0,
            }}>ROCKEFELLER</h1>
          </div>
          <p style={{
            fontSize: 10, fontWeight: 300,
            textTransform: "uppercase", letterSpacing: "0.2em",
            color: "#e4beba", opacity: 0.7, margin: 0,
          }}>Maharashtra Mine Safety Platform</p>
        </header>

        {/* ── Glass card ── */}
        <div style={{
          background: "rgba(32,31,31,0.65)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 4,
          padding: "28px 36px 32px",
          transition: "box-shadow 0.5s, border-color 0.5s",
          boxShadow: isAdmin
            ? "0 0 40px rgba(59,130,246,0.15), 0 20px 60px rgba(0,0,0,0.4)"
            : "0 0 40px rgba(255,179,173,0.1), 0 20px 60px rgba(0,0,0,0.4)",
          border: isAdmin
            ? "1px solid rgba(59,130,246,0.3)"
            : "1px solid rgba(255,179,173,0.2)",
        }}>

          {/* ── Toggle ── */}
          <nav style={{
            display: "flex", marginBottom: 28,
            background: "#1c1b1b", borderRadius: 2, padding: 4,
            position: "relative",
          }}>
            {/* Sliding indicator */}
            <div style={{
              position: "absolute",
              top: 4, bottom: 4,
              left: isAdmin ? "calc(50% + 2px)" : 4,
              width: "calc(50% - 6px)",
              background: "#2a2a2a",
              borderRadius: 2,
              transition: "left 0.3s cubic-bezier(0.4,0,0.2,1)",
            }} />
            {[
              { key: "standard", label: "Field Worker / Officer", icon: null },
              { key: "admin",    label: "Admin Login",            icon: "shield" },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => { setMode(tab.key); setError(""); }}
                style={{
                  flex: 1, padding: "10px 8px", position: "relative", zIndex: 1,
                  fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  border: "none", background: "transparent",
                  borderRadius: 2, cursor: "pointer", fontFamily: "Inter",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6,
                  color: mode === tab.key ? "#ffb3ad" : "#e4beba",
                  opacity: mode === tab.key ? 1 : 0.5,
                  transition: "color 0.3s, opacity 0.3s",
                }}>
                {tab.icon && (
                  <span className="material-symbols-outlined"
                    style={{ fontSize: 13 }}>{tab.icon}</span>
                )}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* ── Admin banner ── */}
          <div style={{
            overflow: "hidden",
            maxHeight: isAdmin ? 80 : 0,
            opacity: isAdmin ? 1 : 0,
            marginBottom: isAdmin ? 20 : 0,
            transition: "max-height 0.4s ease, opacity 0.3s ease, margin 0.3s ease",
          }}>
            <div style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 2, padding: "10px 14px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span className="material-symbols-outlined"
                style={{ color: "#93c5fd", fontSize: 16,
                  fontVariationSettings: "'FILL' 1", flexShrink: 0 }}>
                security
              </span>
              <p style={{
                fontSize: 9, color: "#bfdbfe", margin: 0,
                textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.7,
              }}>
                Administrator Access — All actions are logged and audited
              </p>
            </div>
          </div>

          {/* ── Error ── */}
          <div style={{
            overflow: "hidden",
            maxHeight: error ? 60 : 0,
            opacity: error ? 1 : 0,
            marginBottom: error ? 16 : 0,
            transition: "max-height 0.3s ease, opacity 0.3s ease, margin 0.3s ease",
          }}>
            <div style={{
              background: "rgba(255,84,81,0.1)",
              border: "1px solid rgba(255,84,81,0.3)",
              borderRadius: 2, padding: "9px 14px",
              fontSize: 11, color: "#ff5451", lineHeight: 1.5,
            }}>⚠ {error}</div>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Email */}
              <InputField
                label="Email Identifier"
                type="email" icon="mail"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="name@rockefeller.gov.in"
                focused={focusedField === "email"}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                isAdmin={isAdmin}
              />

              {/* Password */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-end", marginBottom: 8, padding: "0 2px" }}>
                  <label style={{
                    fontSize: 9, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    color: "#e4beba",
                  }}>Access Password</label>
                  <span style={{ fontSize: 9, color: "#ffb3ad", cursor: "pointer",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    opacity: 0.8 }}>
                    Forgot password?
                  </span>
                </div>
                <div style={{
                  position: "relative", display: "flex", alignItems: "center",
                  background: "#1c1b1b",
                  borderBottom: `1px solid ${focusedField === "pw"
                    ? (isAdmin ? "#3b82f6" : "#ffb3ad")
                    : "#5b403e"}`,
                  transition: "border-color 0.2s",
                  boxShadow: focusedField === "pw"
                    ? `0 1px 0 ${isAdmin ? "#3b82f6" : "#ffb3ad"}`
                    : "none",
                }}>
                  <span className="material-symbols-outlined" style={{
                    position: "absolute", left: 12, fontSize: 17,
                    color: focusedField === "pw" ? (isAdmin ? "#93c5fd" : "#ffb3ad") : "#e4beba",
                    pointerEvents: "none", transition: "color 0.2s",
                  }}>lock</span>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onFocus={() => setFocused("pw")}
                    onBlur={() => setFocused(null)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "transparent", border: "none",
                      padding: "13px 40px 13px 40px",
                      color: "#e5e2e1", fontSize: 13,
                      fontFamily: "Inter", outline: "none",
                    }}
                  />
                  <span className="material-symbols-outlined"
                    onClick={() => setShowPw(p => !p)}
                    style={{
                      position: "absolute", right: 12, fontSize: 17,
                      color: "#e4beba", cursor: "pointer",
                      transition: "color 0.2s",
                    }}>
                    {showPw ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>

              {/* Admin code — animated slide-in */}
              <div style={{
                overflow: "hidden",
                maxHeight: isAdmin ? 90 : 0,
                opacity: isAdmin ? 1 : 0,
                transition: "max-height 0.4s ease, opacity 0.3s ease",
              }}>
                <InputField
                  label="Admin Access Code"
                  type="password" icon="vpn_key"
                  value={adminCode} onChange={e => setAdminCode(e.target.value)}
                  placeholder="Enter access code"
                  focused={focusedField === "code"}
                  onFocus={() => setFocused("code")}
                  onBlur={() => setFocused(null)}
                  isAdmin={isAdmin}
                  labelColor="#93c5fd"
                  hint="Provided by your system administrator"
                />
              </div>
            </div>

            {/* ── Submit button ── */}
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", marginTop: 24,
                padding: "13px 0",
                background: loading
                  ? "#3a3939"
                  : isAdmin
                    ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    : "linear-gradient(135deg, #ffb3ad, #ff5451)",
                color: loading ? "#e4beba" : isAdmin ? "#fff" : "#68000a",
                border: "none", borderRadius: 2,
                fontSize: 11, fontWeight: 800,
                textTransform: "uppercase", letterSpacing: "0.2em",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Inter",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                transition: "all 0.3s",
                boxShadow: loading ? "none"
                  : isAdmin
                    ? "0 4px 24px rgba(59,130,246,0.3)"
                    : "0 4px 24px rgba(255,179,173,0.2)",
                transform: "scale(1)",
              }}
              onMouseEnter={e => { if (!loading) e.target.style.transform = "scale(1.01)"; }}
              onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
              onMouseDown={e =>  { if (!loading) e.target.style.transform = "scale(0.98)"; }}
              onMouseUp={e =>    { e.target.style.transform = "scale(1)"; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 13, height: 13,
                    border: "2px solid rgba(228,190,186,0.4)",
                    borderTopColor: "#e4beba",
                    borderRadius: "50%", display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  SIGNING IN...
                </>
              ) : isAdmin ? "Sign In as Administrator" : "Sign In to Portal"}
            </button>

            {/* Signup */}
            <p style={{
              textAlign: "center", marginTop: 20, marginBottom: 0,
              fontSize: 11, color: "#e4beba",
            }}>
              Don't have an account?{" "}
              <span onClick={() => navigate("/signup")} style={{
                color: "#ffb3ad", fontWeight: 700, cursor: "pointer",
                borderBottom: "1px solid transparent",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={e => e.target.style.borderBottomColor = "#ffb3ad"}
                onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}
              >Create one</span>
            </p>
          </form>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        position: "fixed", bottom: 0, width: "100%", zIndex: 50,
        display: "flex", flexDirection: "column",
        alignItems: "center", padding: "16px 48px 14px",
        background: "linear-gradient(to top, rgba(14,14,14,0.95) 60%, transparent)",
        gap: 10,
      }}>
        {/* Partner logos */}
        <div style={{
          display: "flex", alignItems: "center", gap: 28,
          opacity: 0.35, filter: "grayscale(1)",
          transition: "all 0.5s",
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "grayscale(0)"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.35"; e.currentTarget.style.filter = "grayscale(1)"; }}
        >
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHepqoSG-EGsXcO6NOfOOdMkjT2Zaz2FgZmAscKjyMZNGhM4L95aWM9zy-43r1bUFhjx0xsYLdYPmQXfPhDsPmr-yJzGRzBj94-wBA-47Mylai2YjRqu12bwF155XzcVmOBl1uoYbG0rUdyAyFLbBFGSsyoOSdh7gNFYsPSHpTrGrAd1m9pINJZmcfs8mdPdINv2xQYAk0hc7Qm0EsYuh0gRlAGcSxt8CxRwetwLNlLdIyHStMBBaNPGMPYDWj_gTuNC7-Qdik1_g"
            alt="Government of Maharashtra"
            style={{ height: 32, width: "auto", objectFit: "contain" }} />
          <div style={{ width: 1, height: 20, background: "#5b403e" }} />
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxUQ6mWszfk9ggyZgCmvkDMvz7kBocHQNlXlCAfD_d96aB53MreCp5-DQ-BSfJPXL1xp26t6RXlSgaY5Nc7jVi4A_nPlSd5eYi1vY5b9Syg-GNRPkjICiUXMfembGwVVhCiDwMohhyjKvnrycDdYwyD5u_Auefru2cpshyB5qjciGIFLkqz_mNQss1ysqLpfWByA9_B-LqGZXgp-Pm3tq9-uEDfVosUtAj5vni9mPgmkMKg7x2Ufofk2Si41SwNKD52EI993OFIMY"
            alt="IBM" style={{ height: 13, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Legal */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", width: "100%", maxWidth: 900,
        }}>
          <span style={{ fontSize: 8, color: "#5b403e",
            textTransform: "uppercase", letterSpacing: "0.15em" }}>
            Secure connection • Data encrypted • v2.0.0
          </span>
          <div style={{ display: "flex", gap: 20 }}>
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
        </div>
        <span style={{ fontSize: 8, color: "rgba(91,64,62,0.5)",
          textTransform: "uppercase", letterSpacing: "0.1em" }}>
          © 2025 ROCKEFELLER GEOSPATIAL. ALL RIGHTS RESERVED.
        </span>
      </footer>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 1; transform: translate(-50%,-50%) scale(1); }
          50%       { opacity: 0.6; transform: translate(-50%,-50%) scale(1.1); }
        }
        @keyframes driftBg {
          from { background-position: 0 0; }
          to   { background-position: 100px 100px; }
        }
        input::placeholder { color: rgba(228,190,186,0.22); }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px #1c1b1b inset !important;
          -webkit-text-fill-color: #e5e2e1 !important;
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}

// ── Reusable input field ──────────────────────────────────────
function InputField({
  label, type, icon, value, onChange, placeholder,
  focused, onFocus, onBlur, isAdmin,
  labelColor = "#e4beba", hint,
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 9, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.15em",
        color: labelColor, marginBottom: 8, marginLeft: 2,
      }}>{label}</label>
      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        background: "#1c1b1b",
        borderBottom: `1px solid ${focused
          ? (isAdmin ? "#3b82f6" : "#ffb3ad")
          : "#5b403e"}`,
        transition: "border-color 0.2s",
        boxShadow: focused
          ? `0 1px 0 ${isAdmin ? "#3b82f6" : "#ffb3ad"}`
          : "none",
      }}>
        <span className="material-symbols-outlined" style={{
          position: "absolute", left: 12, fontSize: 17,
          color: focused ? (isAdmin ? "#93c5fd" : "#ffb3ad") : "#e4beba",
          pointerEvents: "none", transition: "color 0.2s",
        }}>{icon}</span>
        <input
          type={type} value={value} onChange={onChange}
          placeholder={placeholder}
          onFocus={onFocus} onBlur={onBlur}
          style={{
            width: "100%", background: "transparent", border: "none",
            padding: "13px 14px 13px 40px",
            color: "#e5e2e1", fontSize: 13,
            fontFamily: "Inter", outline: "none",
          }}
        />
      </div>
      {hint && (
        <p style={{ fontSize: 9, color: labelColor, opacity: 0.6,
          margin: "5px 0 0 2px", letterSpacing: "0.04em" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
