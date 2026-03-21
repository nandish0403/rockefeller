import requests

BASE = "http://localhost:8000"

res = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@geoalert.com", "password": "admin123"})
token = res.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

zones = requests.get(f"{BASE}/api/zones", headers=h).json()
zone = zones[0]
zone_id = zone["id"]
district = zone["district"]
print(f"Zone: {zone['name']} | District: {district}")

# Test rainfall — show FULL error
print("\n--- Rainfall Test ---")
r = requests.post(f"{BASE}/api/weather",
    json={"district": district, "rainfall_mm": 300, "warning_level": "orange"},
    headers=h)
print("Status:", r.status_code)
print("Full response:", r.text)   # ← shows exact error

# Test crack report — show FULL error
print("\n--- Crack Test ---")
cr = requests.post(f"{BASE}/api/crack-reports",
    data={"zone_id": zone_id, "severity": "critical", "reported_by": "test"},
    headers=h)
print("Status:", cr.status_code)
print("Full response:", cr.text)  # ← shows exact error

# Upload test — fixed (import at top)
print("\n--- Upload Test ---")
import io
fake_photo = io.BytesIO(b"fake image content")
up = requests.post(f"{BASE}/api/crack-reports",
    data={"zone_id": zone_id, "severity": "high", "reported_by": "test"},
    files={"photo": ("test.jpg", fake_photo, "image/jpeg")},
    headers=h)
print("Upload status:", up.status_code)
print("Upload response:", up.text[:300])
