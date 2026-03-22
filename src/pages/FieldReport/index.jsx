import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/axios";
import { fetchZones } from "../../api/zones";



// ── constants ──────────────────────────────────────────────────
const REPORT_TYPES = [
  { value: "visual_inspection", label: "Visual Inspection",  icon: "visibility"       },
  { value: "blast_log",         label: "Blast Log",          icon: "crisis_alert"     },
  { value: "routine_check",     label: "Routine Check",      icon: "fact_check"       },
  { value: "structural_survey", label: "Structural Survey",  icon: "domain"           },
  { value: "water_seepage",     label: "Water Seepage",      icon: "water_drop"       },
  { value: "other",             label: "Other",              icon: "more_horiz"       },
];

const SEVERITY_LEVELS = [
  { value: "low",      label: "Low",      color: "#4edea3", bg: "rgba(78,222,163,0.1)"  },
  { value: "medium",   label: "Medium",   color: "#ffb95f", bg: "rgba(255,185,95,0.1)"  },
  { value: "high",     label: "High",     color: "#ffb3ad", bg: "rgba(255,179,173,0.1)" },
  { value: "critical", label: "Critical", color: "#ff5451", bg: "rgba(255,84,81,0.1)"   },
];

const EMPTY_FORM = {
  zone_id:          "",
  report_type:      "",
  severity:         "low",
  title:            "",
  description:      "",
  observations:     "",
  location_detail:  "",
  weather_condition:"",
};

// ══════════════════════════════════════════════════════════════
export default function FieldReportPage() {
  const [mounted,   setMounted]   = useState(false);
  const [zones,     setZones]     = useState([]);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [files,     setFiles]     = useState([]);        // photo attachments
  const [previews,  setPreviews]  = useState([]);
  const [submitting,setSubmitting]= useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");
  const [step,      setStep]      = useState(1);         // 1 = details, 2 = review
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    const list = await fetchZones().catch(() => []);
    setZones(list ?? []);
  }, []);

  useEffect(() => { setTimeout(() => setMounted(true), 60); load(); }, [load]);

  // clean up object URLs
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(picked);
    setPreviews(picked.map(f => URL.createObjectURL(f)));
  };

  const removeFile = (i) => {
    setFiles(fs => fs.filter((_, idx) => idx !== i));
    setPreviews(ps => ps.filter((_, idx) => idx !== i));
  };

  const canProceed = form.zone_id && form.report_type &&
    form.title.trim() && form.description.trim();

  const handleSubmit = async () => {
    if (!canProceed) return;
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
      files.forEach(f => fd.append("photos", f));
      await api.post("/api/reports", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setPreviews([]);
    setStep(1);
    setSubmitted(false);
    setError("");
  };

  // ── Success screen ──────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
        padding: "32px", fontFamily: "Inter, sans-serif",
        opacity: mounted ? 1 : 0, transition: "opacity 0.45s",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh",
      }}>
        <div style={{
          textAlign: "center", maxWidth: 420,
          animation: "frFadeUp 0.5s ease both",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "rgba(78,222,163,0.12)",
            border: "2px solid rgba(78,222,163,0.3)",
            display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
            animation: "frPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 36, color: "#4edea3",
              fontVariationSettings: "'FILL' 1",
            }}>check_circle</span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e5e2e1",
            margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Report Submitted
          </h2>
          <p style={{ fontSize: 12, color: "#e4beba", opacity: 0.6,
            margin: "0 0 28px", lineHeight: 1.7 }}>
            Your field report has been logged and forwarded to your
            assigned administrator for review.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <FrBtn label="Submit Another" primary onClick={resetForm} />
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  return (
    <div style={{
      padding: "28px 32px 80px", fontFamily: "Inter, sans-serif",
      opacity: mounted ? 1 : 0, transition: "opacity 0.45s ease",
    }}>

      {/* ── Header ── */}
      <header style={{
        marginBottom: 28, paddingBottom: 20,
        borderBottom: "1px solid rgba(91,64,62,0.12)",
        animation: "frFadeUp 0.4s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center",
          gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 2,
            background: "rgba(255,179,173,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span className="material-symbols-outlined"
              style={{ fontSize: 18, color: "#ffb3ad",
                fontVariationSettings: "'FILL' 1" }}>
              assignment
            </span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e5e2e1",
              margin: 0, letterSpacing: "-0.02em" }}>
              Field Report
            </h1>
            <p style={{ fontSize: 10, color: "#e4beba", opacity: 0.5,
              margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Submit a new observation or inspection log
            </p>
          </div>
        </div>
      </header>

      {/* ── Step indicator ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 0,
        marginBottom: 28, maxWidth: 380,
        animation: "frFadeUp 0.4s ease 0.05s both",
      }}>
        {[
          { n: 1, label: "Report Details" },
          { n: 2, label: "Review & Submit" },
        ].map(({ n, label }, i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                background: step >= n
                  ? "rgba(255,179,173,0.15)" : "rgba(91,64,62,0.1)",
                border: `1.5px solid ${step >= n ? "#ffb3ad" : "rgba(91,64,62,0.25)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                {step > n
                  ? <span className="material-symbols-outlined"
                      style={{ fontSize: 14, color: "#4edea3",
                        fontVariationSettings: "'FILL' 1" }}>check</span>
                  : <span style={{ fontSize: 10, fontWeight: 800,
                      color: step === n ? "#ffb3ad" : "#5b403e" }}>{n}</span>
                }
              </div>
              <span style={{ fontSize: 10, fontWeight: 700,
                color: step >= n ? "#e5e2e1" : "#5b403e",
                textTransform: "uppercase", letterSpacing: "0.1em",
                transition: "color 0.3s" }}>{label}</span>
            </div>
            {i < 1 && (
              <div style={{
                flex: 1, height: 1, margin: "0 12px",
                background: step > 1
                  ? "rgba(255,179,173,0.3)" : "rgba(91,64,62,0.15)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: "rgba(255,84,81,0.1)",
          border: "1px solid rgba(255,84,81,0.25)",
          borderRadius: 2, padding: "10px 16px",
          fontSize: 11, color: "#ff5451", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 8,
          animation: "frFadeUp 0.3s ease both",
        }}>
          <span className="material-symbols-outlined"
            style={{ fontSize: 16 }}>warning</span>
          {error}
        </div>
      )}

      {/* ════════ STEP 1: Report Details ════════ */}
      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px",
          gap: 24, animation: "frFadeUp 0.35s ease both" }}>

          {/* ── Left: main form ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Zone + Type row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Zone selector */}
              <FormCard label="Assigned Zone" required
                icon="location_on" delay={0}>
                <div style={{ position: "relative" }}>
                  <select value={form.zone_id}
                    onChange={e => set("zone_id", e.target.value)}
                    style={selectStyle(!form.zone_id)}>
                    <option value="">Select zone…</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined" style={selectArrow}>
                    expand_more
                  </span>
                </div>
              </FormCard>

              {/* Report type */}
              <FormCard label="Report Type" required
                icon="category" delay={0.05}>
                <div style={{ position: "relative" }}>
                  <select value={form.report_type}
                    onChange={e => set("report_type", e.target.value)}
                    style={selectStyle(!form.report_type)}>
                    <option value="">Select type…</option>
                    {REPORT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined" style={selectArrow}>
                    expand_more
                  </span>
                </div>
              </FormCard>
            </div>

            {/* Report type quick-pick pills */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              animation: "frFadeUp 0.35s ease 0.08s both",
            }}>
              {REPORT_TYPES.map(t => (
                <button key={t.value}
                  onClick={() => set("report_type", t.value)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 99, border: "none",
                  cursor: "pointer", fontFamily: "Inter",
                  fontSize: 10, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  transition: "all 0.2s",
                  background: form.report_type === t.value
                    ? "rgba(255,179,173,0.15)" : "rgba(42,42,42,0.8)",
                  color: form.report_type === t.value
                    ? "#ffb3ad" : "#e4beba",
                  border: `1px solid ${form.report_type === t.value
                    ? "rgba(255,179,173,0.35)" : "rgba(91,64,62,0.2)"}`,
                  transform: form.report_type === t.value
                    ? "scale(1.03)" : "scale(1)",
                }}>
                  <span className="material-symbols-outlined"
                    style={{ fontSize: 13 }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Title */}
            <FormCard label="Report Title" required icon="title" delay={0.1}>
              <input
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Crack observed on north face of Sector 3"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.2)"}
              />
            </FormCard>

            {/* Description */}
            <FormCard label="Description" required icon="description" delay={0.13}>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Detailed description of what was observed..."
                rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: 100 }}
                onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.2)"}
              />
            </FormCard>

            {/* Observations */}
            <FormCard label="Field Observations" icon="biotech" delay={0.16}>
              <textarea
                value={form.observations}
                onChange={e => set("observations", e.target.value)}
                placeholder="Additional measurements, readings, or on-site notes..."
                rows={3} style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.2)"}
              />
            </FormCard>

            {/* Location + Weather row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <FormCard label="Location Detail" icon="my_location" delay={0.18}>
                <input
                  value={form.location_detail}
                  onChange={e => set("location_detail", e.target.value)}
                  placeholder="e.g. North face, 200m from entrance"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(255,179,173,0.4)"}
                  onBlur={e => e.target.style.borderColor = "rgba(91,64,62,0.2)"}
                />
              </FormCard>
              <FormCard label="Weather Condition" icon="partly_cloudy_day" delay={0.2}>
                <div style={{ position: "relative" }}>
                  <select value={form.weather_condition}
                    onChange={e => set("weather_condition", e.target.value)}
                    style={selectStyle(false)}>
                    <option value="">Select…</option>
                    {["Clear", "Cloudy", "Rainy", "Heavy Rain",
                      "Foggy", "Windy", "Post-Storm"].map(w => (
                      <option key={w} value={w.toLowerCase().replace(" ", "_")}>
                        {w}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined" style={selectArrow}>
                    expand_more
                  </span>
                </div>
              </FormCard>
            </div>
          </div>

          {/* ── Right: severity + photos ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Severity picker */}
            <div style={{
              background: "rgba(42,42,42,0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(91,64,62,0.15)",
              borderRadius: 4, padding: 20,
              animation: "frFadeUp 0.4s ease 0.05s both",
            }}>
              <p style={sectionLabel}>Severity Level</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SEVERITY_LEVELS.map(s => (
                  <button key={s.value}
                    onClick={() => set("severity", s.value)} style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px", borderRadius: 2,
                    border: `1px solid ${form.severity === s.value
                      ? s.color + "44" : "rgba(91,64,62,0.15)"}`,
                    background: form.severity === s.value
                      ? s.bg : "transparent",
                    cursor: "pointer", transition: "all 0.2s",
                    transform: form.severity === s.value
                      ? "translateX(3px)" : "translateX(0)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: s.color, flexShrink: 0,
                        boxShadow: form.severity === s.value
                          ? `0 0 8px ${s.color}` : "none",
                        animation: form.severity === s.value && s.value === "critical"
                          ? "frPulseDot 2s infinite" : "none",
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 700,
                        color: form.severity === s.value ? s.color : "#e4beba",
                        fontFamily: "Inter" }}>{s.label}</span>
                    </div>
                    {form.severity === s.value && (
                      <span className="material-symbols-outlined"
                        style={{ fontSize: 16, color: s.color,
                          fontVariationSettings: "'FILL' 1" }}>
                        radio_button_checked
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo upload */}
            <div style={{
              background: "rgba(42,42,42,0.6)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(91,64,62,0.15)",
              borderRadius: 4, padding: 20,
              animation: "frFadeUp 0.4s ease 0.12s both",
            }}>
              <p style={sectionLabel}>Photo Attachments</p>
              <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.4,
                textTransform: "uppercase", letterSpacing: "0.1em",
                margin: "0 0 12px" }}>
                Up to 4 images • JPG / PNG
              </p>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "rgba(255,179,173,0.5)";
                  e.currentTarget.style.background = "rgba(255,179,173,0.05)";
                }}
                onDragLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(91,64,62,0.2)";
                  e.currentTarget.style.background = "transparent";
                }}
                onDrop={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "rgba(91,64,62,0.2)";
                  e.currentTarget.style.background = "transparent";
                  const dropped = Array.from(e.dataTransfer.files)
                    .filter(f => f.type.startsWith("image/")).slice(0, 4);
                  setFiles(dropped);
                  setPreviews(dropped.map(f => URL.createObjectURL(f)));
                }}
                style={{
                  border: "1.5px dashed rgba(91,64,62,0.3)",
                  borderRadius: 2, padding: "24px 16px",
                  textAlign: "center", cursor: "pointer",
                  transition: "all 0.2s", marginBottom: 12,
                  display: files.length > 0 ? "none" : "block",
                }}>
                <span className="material-symbols-outlined"
                  style={{ fontSize: 28, color: "#ffb3ad",
                    opacity: 0.3, display: "block", marginBottom: 8 }}>
                  cloud_upload
                </span>
                <p style={{ fontSize: 10, color: "#e4beba",
                  opacity: 0.5, margin: 0 }}>
                  Click or drag photos here
                </p>
              </div>
              <input ref={fileRef} type="file" multiple accept="image/*"
                onChange={handleFiles} style={{ display: "none" }} />

              {/* Previews */}
              {previews.length > 0 && (
                <div style={{ display: "grid",
                  gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {previews.map((src, i) => (
                    <div key={i} style={{ position: "relative",
                      borderRadius: 2, overflow: "hidden",
                      animation: `frFadeUp 0.3s ease ${i * 0.05}s both` }}>
                      <img src={src} alt={`preview-${i}`} style={{
                        width: "100%", aspectRatio: "4/3",
                        objectFit: "cover", display: "block",
                      }} />
                      <button onClick={() => removeFile(i)} style={{
                        position: "absolute", top: 4, right: 4,
                        width: 20, height: 20, borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)", border: "none",
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        color: "#fff",
                      }}>
                        <span className="material-symbols-outlined"
                          style={{ fontSize: 12 }}>close</span>
                      </button>
                    </div>
                  ))}
                  {previews.length < 4 && (
                    <div onClick={() => fileRef.current?.click()} style={{
                      aspectRatio: "4/3", border: "1.5px dashed rgba(91,64,62,0.3)",
                      borderRadius: 2, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      cursor: "pointer", transition: "border-color 0.2s",
                    }}
                      onMouseEnter={e =>
                        e.currentTarget.style.borderColor = "rgba(255,179,173,0.4)"}
                      onMouseLeave={e =>
                        e.currentTarget.style.borderColor = "rgba(91,64,62,0.3)"}
                    >
                      <span className="material-symbols-outlined"
                        style={{ fontSize: 20, color: "#ffb3ad", opacity: 0.3 }}>
                        add
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Proceed button */}
            <FrBtn
              label="Review Report →"
              primary
              disabled={!canProceed}
              onClick={() => { setError(""); setStep(2); }}
              full
            />
            {!canProceed && (
              <p style={{ fontSize: 9, color: "#e4beba", opacity: 0.35,
                textAlign: "center", textTransform: "uppercase",
                letterSpacing: "0.1em", margin: "-12px 0 0" }}>
                Zone, type, title & description required
              </p>
            )}
          </div>
        </div>
      )}

      {/* ════════ STEP 2: Review & Submit ════════ */}
      {step === 2 && (
        <div style={{ maxWidth: 640, animation: "frFadeUp 0.35s ease both" }}>
          <div style={{
            background: "rgba(42,42,42,0.6)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(91,64,62,0.15)",
            borderRadius: 4, overflow: "hidden",
          }}>
            {/* Review header */}
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(91,64,62,0.1)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span className="material-symbols-outlined"
                style={{ fontSize: 18, color: "#ffb3ad" }}>preview</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#e5e2e1",
                textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Review Submission
              </span>
            </div>

            {/* Review fields */}
            <div style={{ padding: 24, display: "flex",
              flexDirection: "column", gap: 0 }}>
              {[
                { label: "Zone",
                  val: zones.find(z => z.id === form.zone_id)?.name ?? form.zone_id },
                { label: "Report Type",
                  val: REPORT_TYPES.find(t => t.value === form.report_type)?.label ?? "—" },
                { label: "Title",       val: form.title                                    },
                { label: "Severity",    val: form.severity,    isSeverity: true            },
                { label: "Description", val: form.description, long: true                  },
                ...(form.observations ? [{ label: "Observations",
                  val: form.observations, long: true }] : []),
                ...(form.location_detail ? [{ label: "Location",
                  val: form.location_detail }] : []),
                ...(form.weather_condition ? [{ label: "Weather",
                  val: form.weather_condition.replace("_", " ") }] : []),
                ...(files.length ? [{ label: "Attachments",
                  val: `${files.length} photo${files.length > 1 ? "s" : ""}` }] : []),
              ].map(({ label, val, isSeverity, long }, i) => {
                const sev = SEVERITY_LEVELS.find(s => s.value === val);
                return (
                  <div key={label} style={{
                    display: "flex", gap: 16,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(91,64,62,0.07)",
                    animation: `frFadeUp 0.3s ease ${i * 0.04}s both`,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#e4beba",
                      opacity: 0.4, textTransform: "uppercase",
                      letterSpacing: "0.12em", width: 110, flexShrink: 0,
                      paddingTop: 1 }}>{label}</span>
                    {isSeverity && sev ? (
                      <span style={{
                        fontSize: 10, fontWeight: 800, color: sev.color,
                        background: sev.bg, borderRadius: 2,
                        padding: "2px 8px", textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}>{sev.label}</span>
                    ) : (
                      <span style={{ fontSize: 12, color: "#e5e2e1",
                        lineHeight: long ? 1.7 : 1.4, flex: 1 }}>{val || "—"}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Photo strip */}
            {previews.length > 0 && (
              <div style={{ padding: "0 24px 20px",
                display: "flex", gap: 8 }}>
                {previews.map((src, i) => (
                  <img key={i} src={src} alt={`att-${i}`} style={{
                    width: 72, height: 54, objectFit: "cover",
                    borderRadius: 2, opacity: 0.8,
                  }} />
                ))}
              </div>
            )}

            {/* Action row */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(91,64,62,0.1)",
              display: "flex", gap: 10, justifyContent: "flex-end",
            }}>
              <FrBtn label="← Edit" onClick={() => setStep(1)} />
              <FrBtn
                primary
                label={submitting ? "Submitting…" : "Submit Report"}
                onClick={handleSubmit}
                disabled={submitting}
                icon={submitting ? null : "send"}
              />
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function FormCard({ label, required, icon, delay = 0, children }) {
  return (
    <div style={{ animation: `frFadeUp 0.4s ease ${delay}s both` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
        marginBottom: 7 }}>
        <span className="material-symbols-outlined"
          style={{ fontSize: 14, color: "#ffb3ad", opacity: 0.6 }}>{icon}</span>
        <label style={{
          fontSize: 9, fontWeight: 700, color: "#e4beba",
          textTransform: "uppercase", letterSpacing: "0.13em",
        }}>
          {label}
          {required && <span style={{ color: "#ff5451", marginLeft: 3 }}>*</span>}
        </label>
      </div>
      {children}
    </div>
  );
}

function FrBtn({ label, onClick, primary, disabled, icon, full }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center",
        justifyContent: "center", gap: 6,
        padding: "10px 22px", borderRadius: 2, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "Inter", fontSize: 10, fontWeight: 800,
        textTransform: "uppercase", letterSpacing: "0.12em",
        transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : undefined,
        background: primary
          ? hov ? "rgba(255,84,81,0.9)"
                : "linear-gradient(135deg,#ffb3ad,#ff5451)"
          : hov ? "#3a3939" : "#2a2a2a",
        color: primary ? "#68000a" : "#e4beba",
        boxShadow: primary && !disabled
          ? "0 4px 16px rgba(255,84,81,0.25)" : "none",
        transform: hov && !disabled ? "translateY(-1px)" : "translateY(0)",
      }}>
      {icon && (
        <span className="material-symbols-outlined"
          style={{ fontSize: 15 }}>{icon}</span>
      )}
      {label}
    </button>
  );
}

// ── Shared styles ───────────────────────────────────────────────
const sectionLabel = {
  fontSize: 9, fontWeight: 700, color: "#e4beba",
  opacity: 0.5, textTransform: "uppercase",
  letterSpacing: "0.14em", margin: "0 0 12px",
};

const inputStyle = {
  width: "100%", background: "#1c1b1b",
  border: "1px solid rgba(91,64,62,0.2)",
  borderRadius: 2, padding: "10px 12px",
  color: "#e5e2e1", fontSize: 12,
  fontFamily: "Inter", outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

function selectStyle(empty) {
  return {
    ...inputStyle,
    appearance: "none", cursor: "pointer",
    color: empty ? "rgba(228,190,186,0.3)" : "#e5e2e1",
    paddingRight: 32,
  };
}

const selectArrow = {
  position: "absolute", right: 10, top: "50%",
  transform: "translateY(-50%)", fontSize: 16,
  color: "#e4beba", pointerEvents: "none",
};

const CSS = `
  @keyframes frFadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes frPop     { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
  @keyframes frPulseDot{ 0%,100%{box-shadow:0 0 6px currentColor} 50%{box-shadow:none} }
  select option { background:#1c1b1b; color:#e5e2e1; }
  textarea { resize: vertical; }
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 100px #1c1b1b inset !important;
    -webkit-text-fill-color: #e5e2e1 !important;
  }
  ::-webkit-scrollbar { width: 3px }
  ::-webkit-scrollbar-track { background: #0e0e0e }
  ::-webkit-scrollbar-thumb { background: #3a3939; border-radius: 4px }
`;

