import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Chip, Divider, Typography } from "@mui/material";
import { useAuth } from "../../context/AuthContext";

const SENSOR_LIMITS = {
  inclinometer: 7.0,  // deg
  piezometer: 120,    // kPa
  rainfall: 35,       // mm/hr
};

const ZONE_SEED = [
  {
    zone_code: "z001",
    zone_name: "Sector A - North Pit",
    district: "Nagpur",
    inclinometer: 5.8,
    piezometer: 92,
    rainfall: 18,
  },
  {
    zone_code: "z003",
    zone_name: "Deep Cut Zone 1",
    district: "Chandrapur",
    inclinometer: 6.4,
    piezometer: 108,
    rainfall: 23,
  },
  {
    zone_code: "z005",
    zone_name: "Bauxite Pit Alpha",
    district: "Ratnagiri",
    inclinometer: 4.9,
    piezometer: 84,
    rainfall: 11,
  },
  {
    zone_code: "z010",
    zone_name: "Iron Ore Zone West",
    district: "Kolhapur",
    inclinometer: 7.2,
    piezometer: 126,
    rainfall: 37,
  },
];

const SENSOR_META = [
  {
    key: "inclinometer",
    label: "Inclinometer",
    unit: "deg",
    icon: "settings_input_component",
    limit: SENSOR_LIMITS.inclinometer,
  },
  {
    key: "piezometer",
    label: "Piezometer",
    unit: "kPa",
    icon: "water_drop",
    limit: SENSOR_LIMITS.piezometer,
  },
  {
    key: "rainfall",
    label: "Rainfall Gauge",
    unit: "mm/hr",
    icon: "rainy",
    limit: SENSOR_LIMITS.rainfall,
  },
];

function clamp(value, low, high) {
  return Math.max(low, Math.min(high, value));
}

function driftValue(value, limit, volatility = 0.08) {
  const spread = limit * volatility;
  const next = value + (Math.random() * spread * 2 - spread);
  return Number(clamp(next, 0, limit * 1.7).toFixed(2));
}

function isBreached(sensorKey, value) {
  return value >= SENSOR_LIMITS[sensorKey];
}

function riskTone(ratio) {
  if (ratio >= 1) return { label: "Breach", color: "#ff4b4b" };
  if (ratio >= 0.8) return { label: "Warning", color: "#ffb95f" };
  return { label: "Normal", color: "#4edea3" };
}

function GaugeCard({ title, icon, value, unit, limit }) {
  const ratio = limit > 0 ? value / limit : 0;
  const pct = clamp(ratio, 0, 1.3) / 1.3;
  const tone = riskTone(ratio);
  const deg = Math.round(pct * 360);

  return (
    <Box
      sx={{
        background: "#1b1a1a",
        border: "1px solid rgba(255,179,173,0.14)",
        borderRadius: "10px",
        padding: "16px",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.2 }}>
        <Typography sx={{ fontSize: 12, color: "#e4beba", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {title}
        </Typography>
        <span className="material-symbols-outlined" style={{ color: tone.color, fontSize: 20 }}>
          {icon}
        </span>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            width: 66,
            height: 66,
            borderRadius: "50%",
            background: `conic-gradient(${tone.color} ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "#131313",
              display: "grid",
              placeItems: "center",
              color: "#e5e2e1",
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {Math.round(pct * 100)}%
          </Box>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 26, lineHeight: 1 }}>
            {value}
            <Typography component="span" sx={{ fontSize: 12, color: "#c2b8b6", ml: 0.8 }}>
              {unit}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 11, color: "#9f9a99", mt: 0.5 }}>
            Limit {limit} {unit}
          </Typography>
          <Chip
            label={tone.label}
            size="small"
            sx={{
              mt: 0.9,
              height: 20,
              bgcolor: `${tone.color}22`,
              border: `1px solid ${tone.color}66`,
              color: tone.color,
              fontWeight: 700,
              fontSize: 10,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default function IoTSensorsPage() {
  const { currentUser } = useAuth();
  const [zones, setZones] = useState(ZONE_SEED);
  const [sensorAlerts, setSensorAlerts] = useState([]);
  const previousBreachesRef = useRef({});

  const isAdmin = currentUser?.role === "admin";

  const visibleZones = useMemo(() => {
    if (isAdmin) return zones;

    const assigned = (currentUser?.zone_assigned || "").toLowerCase().trim();
    if (!assigned) return zones.slice(0, 1);

    const filtered = zones.filter((z) =>
      z.zone_code.toLowerCase() === assigned || z.zone_name.toLowerCase() === assigned
    );
    return filtered.length ? filtered : zones.slice(0, 1);
  }, [zones, isAdmin, currentUser?.zone_assigned]);

  useEffect(() => {
    const timer = setInterval(() => {
      setZones((prev) =>
        prev.map((z) => ({
          ...z,
          inclinometer: driftValue(z.inclinometer, SENSOR_LIMITS.inclinometer),
          piezometer: driftValue(z.piezometer, SENSOR_LIMITS.piezometer),
          rainfall: driftValue(z.rainfall, SENSOR_LIMITS.rainfall),
        }))
      );
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const nextAlerts = [];

    for (const zone of visibleZones) {
      for (const sensor of SENSOR_META) {
        const current = isBreached(sensor.key, zone[sensor.key]);
        const breachKey = `${zone.zone_code}:${sensor.key}`;
        const previous = previousBreachesRef.current[breachKey];

        if (current && !previous) {
          nextAlerts.push({
            id: `${breachKey}:${Date.now()}`,
            zone_name: zone.zone_name,
            sensor: sensor.label,
            value: zone[sensor.key],
            limit: sensor.limit,
            unit: sensor.unit,
            created_at: new Date().toISOString(),
          });
        }
        previousBreachesRef.current[breachKey] = current;
      }
    }

    if (nextAlerts.length) {
      setSensorAlerts((prev) => [...nextAlerts, ...prev].slice(0, 20));
    }
  }, [visibleZones]);

  return (
    <Box sx={{ px: 4, py: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
        <Box>
          <Typography sx={{ color: "#fff", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
            IoT Sensor Dashboard
          </Typography>
          <Typography sx={{ color: "#b7adab", fontSize: 12 }}>
            Live dummy readings by zone for inclinometer, piezometer, and rainfall gauge.
          </Typography>
        </Box>
        <Chip
          label={isAdmin ? "Admin View: All Zones" : "Field View: Assigned Zone"}
          sx={{
            bgcolor: "rgba(255,179,173,0.15)",
            border: "1px solid rgba(255,179,173,0.4)",
            color: "#ffb3ad",
            fontWeight: 700,
          }}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.45fr 1fr" }, gap: 2.2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {visibleZones.map((zone) => (
            <Box
              key={zone.zone_code}
              sx={{
                background: "linear-gradient(180deg, #1d1b1b, #171616)",
                border: "1px solid rgba(255,179,173,0.14)",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.4 }}>
                <Box>
                  <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{zone.zone_name}</Typography>
                  <Typography sx={{ color: "#ae9f9c", fontSize: 11 }}>{zone.district} · {zone.zone_code.toUpperCase()}</Typography>
                </Box>
                <Chip
                  label={SENSOR_META.some((s) => isBreached(s.key, zone[s.key])) ? "Sensor Breach" : "Healthy"}
                  size="small"
                  sx={{
                    bgcolor: SENSOR_META.some((s) => isBreached(s.key, zone[s.key])) ? "rgba(255,84,81,0.15)" : "rgba(78,222,163,0.16)",
                    border: SENSOR_META.some((s) => isBreached(s.key, zone[s.key]))
                      ? "1px solid rgba(255,84,81,0.5)"
                      : "1px solid rgba(78,222,163,0.55)",
                    color: SENSOR_META.some((s) => isBreached(s.key, zone[s.key])) ? "#ff5451" : "#4edea3",
                    fontWeight: 700,
                    fontSize: 10,
                  }}
                />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" }, gap: 1.2 }}>
                {SENSOR_META.map((sensor) => (
                  <GaugeCard
                    key={sensor.key}
                    title={sensor.label}
                    icon={sensor.icon}
                    value={zone[sensor.key]}
                    unit={sensor.unit}
                    limit={sensor.limit}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            background: "#171616",
            border: "1px solid rgba(255,179,173,0.14)",
            borderRadius: "12px",
            p: 2,
            minHeight: 300,
          }}
        >
          <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 15, mb: 0.6 }}>
            Auto-Generated Sensor Alerts
          </Typography>
          <Typography sx={{ color: "#a79f9d", fontSize: 11, mb: 1.2 }}>
            Alert is generated whenever a sensor crosses its threshold from safe to breached.
          </Typography>
          <Divider sx={{ borderColor: "rgba(255,179,173,0.14)", mb: 1.2 }} />

          {sensorAlerts.length === 0 ? (
            <Typography sx={{ color: "#8f8886", fontSize: 12, mt: 2 }}>
              No breaches detected yet in current session.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sensorAlerts.map((a) => (
                <Box
                  key={a.id}
                  sx={{
                    p: 1.2,
                    borderRadius: "8px",
                    background: "rgba(255,84,81,0.08)",
                    border: "1px solid rgba(255,84,81,0.35)",
                  }}
                >
                  <Typography sx={{ color: "#ffb3ad", fontWeight: 700, fontSize: 12 }}>
                    {a.zone_name}
                  </Typography>
                  <Typography sx={{ color: "#e6dedd", fontSize: 11.5 }}>
                    {a.sensor} breached: {a.value} {a.unit} (limit {a.limit} {a.unit})
                  </Typography>
                  <Typography sx={{ color: "#9f9997", fontSize: 10, mt: 0.3 }}>
                    {new Date(a.created_at).toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
