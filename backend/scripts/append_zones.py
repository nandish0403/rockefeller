import json, os

DATA = os.path.join(os.path.dirname(__file__), "data")

NEW_ZONES = [
    # ── Konkan ───────────────────────────────────────────────────────────
    {"id":"z028","name":"Palghar Stone Quarry North","mineName":"Palghar Basalt Quarries","district":"Palghar","riskLevel":"orange","riskScore":71,"latlngs":[[19.70,72.72],[19.79,72.72],[19.79,72.81],[19.70,72.81]],"soilType":"Basalt","slopeAngle":37,"lastLandslide":"2024-09-14","blastCount7d":8,"recentRainfall":198,"status":"warning"},
    {"id":"z029","name":"Manor Quarry Belt","mineName":"Manor Rock Extraction","district":"Palghar","riskLevel":"yellow","riskScore":49,"latlngs":[[19.75,72.77],[19.84,72.77],[19.84,72.86],[19.75,72.86]],"soilType":"Basalt","slopeAngle":21,"lastLandslide":"2023-06-10","blastCount7d":3,"recentRainfall":85,"status":"monitoring"},
    {"id":"z030","name":"Bhiwandi Basalt Cut","mineName":"Thane Basalt Mining Ltd.","district":"Thane","riskLevel":"yellow","riskScore":52,"latlngs":[[19.17,73.05],[19.26,73.05],[19.26,73.14],[19.17,73.14]],"soilType":"Basalt","slopeAngle":26,"lastLandslide":"2023-10-05","blastCount7d":4,"recentRainfall":110,"status":"monitoring"},
    {"id":"z031","name":"Murbad Rock Quarry","mineName":"Murbad Quarry Operations","district":"Thane","riskLevel":"green","riskScore":20,"latlngs":[[19.27,73.10],[19.36,73.10],[19.36,73.19],[19.27,73.19]],"soilType":"Hard Basalt","slopeAngle":13,"lastLandslide":"2022-05-18","blastCount7d":1,"recentRainfall":38,"status":"monitoring"},
    # ── North Maharashtra ────────────────────────────────────────────────
    {"id":"z032","name":"Jalgaon Silica Belt East","mineName":"Jalgaon Silica Mines","district":"Jalgaon","riskLevel":"yellow","riskScore":46,"latlngs":[[20.96,75.51],[21.05,75.51],[21.05,75.60],[20.96,75.60]],"soilType":"Alluvial","slopeAngle":18,"lastLandslide":"2023-03-22","blastCount7d":2,"recentRainfall":72,"status":"monitoring"},
    {"id":"z033","name":"Bhusawal Quarry Section","mineName":"Bhusawal Stone Works","district":"Jalgaon","riskLevel":"green","riskScore":23,"latlngs":[[21.01,75.61],[21.10,75.61],[21.10,75.70],[21.01,75.70]],"soilType":"Sandstone","slopeAngle":11,"lastLandslide":"2022-07-09","blastCount7d":1,"recentRainfall":41,"status":"monitoring"},
    # ── Western Maharashtra ──────────────────────────────────────────────
    {"id":"z034","name":"Ahmednagar Basalt Zone A","mineName":"Ahmednagar Mining Corp.","district":"Ahmednagar","riskLevel":"orange","riskScore":67,"latlngs":[[19.04,74.69],[19.13,74.69],[19.13,74.78],[19.04,74.78]],"soilType":"Basalt","slopeAngle":30,"lastLandslide":"2024-04-17","blastCount7d":6,"recentRainfall":132,"status":"warning"},
    {"id":"z035","name":"Rahuri Limestone Quarry","mineName":"Rahuri Lime Extraction","district":"Ahmednagar","riskLevel":"yellow","riskScore":43,"latlngs":[[19.14,74.74],[19.23,74.74],[19.23,74.83],[19.14,74.83]],"soilType":"Limestone","slopeAngle":19,"lastLandslide":"2023-08-11","blastCount7d":3,"recentRainfall":77,"status":"monitoring"},
    {"id":"z036","name":"Sangli Laterite Mine","mineName":"Sangli Mineral Works","district":"Sangli","riskLevel":"yellow","riskScore":55,"latlngs":[[16.81,74.52],[16.90,74.52],[16.90,74.61],[16.81,74.61]],"soilType":"Laterite","slopeAngle":23,"lastLandslide":"2023-11-20","blastCount7d":4,"recentRainfall":96,"status":"monitoring"},
    {"id":"z037","name":"Miraj Stone Quarry","mineName":"Miraj Rock Industries","district":"Sangli","riskLevel":"green","riskScore":17,"latlngs":[[16.91,74.57],[17.00,74.57],[17.00,74.66],[16.91,74.66]],"soilType":"Basalt","slopeAngle":10,"lastLandslide":"2021-12-03","blastCount7d":0,"recentRainfall":29,"status":"monitoring"},
    {"id":"z038","name":"Solapur Basalt Belt","mineName":"Solapur Quarry Consortium","district":"Solapur","riskLevel":"yellow","riskScore":50,"latlngs":[[17.63,75.85],[17.72,75.85],[17.72,75.94],[17.63,75.94]],"soilType":"Basalt","slopeAngle":20,"lastLandslide":"2023-09-07","blastCount7d":3,"recentRainfall":88,"status":"monitoring"},
    {"id":"z039","name":"Akkalkot Limestone Zone","mineName":"Akkalkot Lime Corp.","district":"Solapur","riskLevel":"green","riskScore":26,"latlngs":[[17.73,75.90],[17.82,75.90],[17.82,75.99],[17.73,75.99]],"soilType":"Limestone","slopeAngle":15,"lastLandslide":"2022-08-14","blastCount7d":1,"recentRainfall":47,"status":"monitoring"},
    # ── Marathwada ───────────────────────────────────────────────────────
    {"id":"z040","name":"Jalna Basalt Quarry Zone","mineName":"Jalna Rock Mining Co.","district":"Jalna","riskLevel":"yellow","riskScore":48,"latlngs":[[19.79,75.83],[19.88,75.83],[19.88,75.92],[19.79,75.92]],"soilType":"Basalt","slopeAngle":19,"lastLandslide":"2023-07-25","blastCount7d":3,"recentRainfall":79,"status":"monitoring"},
    {"id":"z041","name":"Ambad Stone Cut Section","mineName":"Ambad Quarry Works","district":"Jalna","riskLevel":"green","riskScore":22,"latlngs":[[19.89,75.88],[19.98,75.88],[19.98,75.97],[19.89,75.97]],"soilType":"Hard Basalt","slopeAngle":12,"lastLandslide":"2022-04-11","blastCount7d":1,"recentRainfall":34,"status":"monitoring"},
    {"id":"z042","name":"Beed Basalt Cut Zone A","mineName":"Beed Mining Industries","district":"Beed","riskLevel":"orange","riskScore":64,"latlngs":[[18.94,75.71],[19.03,75.71],[19.03,75.80],[18.94,75.80]],"soilType":"Basalt","slopeAngle":29,"lastLandslide":"2024-03-29","blastCount7d":6,"recentRainfall":128,"status":"warning"},
    {"id":"z043","name":"Parli Limestone Belt","mineName":"Parli Lime Extraction","district":"Beed","riskLevel":"yellow","riskScore":41,"latlngs":[[19.04,75.76],[19.13,75.76],[19.13,75.85],[19.04,75.85]],"soilType":"Limestone","slopeAngle":17,"lastLandslide":"2023-05-16","blastCount7d":2,"recentRainfall":65,"status":"monitoring"},
    {"id":"z044","name":"Latur Basalt Zone East","mineName":"Latur Rock Corp.","district":"Latur","riskLevel":"orange","riskScore":69,"latlngs":[[18.35,76.51],[18.44,76.51],[18.44,76.60],[18.35,76.60]],"soilType":"Basalt","slopeAngle":33,"lastLandslide":"2024-06-08","blastCount7d":7,"recentRainfall":142,"status":"warning"},
    {"id":"z045","name":"Udgir Stone Quarry","mineName":"Udgir Stone Works","district":"Latur","riskLevel":"yellow","riskScore":44,"latlngs":[[18.45,76.56],[18.54,76.56],[18.54,76.65],[18.45,76.65]],"soilType":"Basalt","slopeAngle":18,"lastLandslide":"2023-04-02","blastCount7d":2,"recentRainfall":70,"status":"monitoring"},
    {"id":"z046","name":"Parbhani Basalt Mine","mineName":"Parbhani Mineral Extraction","district":"Parbhani","riskLevel":"yellow","riskScore":47,"latlngs":[[19.22,76.72],[19.31,76.72],[19.31,76.81],[19.22,76.81]],"soilType":"Basalt","slopeAngle":20,"lastLandslide":"2023-10-19","blastCount7d":3,"recentRainfall":82,"status":"monitoring"},
    {"id":"z047","name":"Hingoli Quarry Zone","mineName":"Hingoli Rock Industries","district":"Hingoli","riskLevel":"green","riskScore":24,"latlngs":[[19.67,77.10],[19.76,77.10],[19.76,77.19],[19.67,77.19]],"soilType":"Basalt","slopeAngle":13,"lastLandslide":"2022-06-30","blastCount7d":1,"recentRainfall":45,"status":"monitoring"},
    # ── Vidarbha (Amravati Division) ─────────────────────────────────────
    {"id":"z048","name":"Amravati Manganese Block","mineName":"Amravati Ore Mining","district":"Amravati","riskLevel":"red","riskScore":85,"latlngs":[[20.88,77.70],[20.97,77.70],[20.97,77.79],[20.88,77.79]],"soilType":"Laterite","slopeAngle":42,"lastLandslide":"2025-01-22","blastCount7d":10,"recentRainfall":258,"status":"critical"},
    {"id":"z049","name":"Achalpur Mine Zone","mineName":"Achalpur Coal Works","district":"Amravati","riskLevel":"orange","riskScore":70,"latlngs":[[20.98,77.75],[21.07,77.75],[21.07,77.84],[20.98,77.84]],"soilType":"Clay","slopeAngle":32,"lastLandslide":"2024-07-11","blastCount7d":7,"recentRainfall":156,"status":"warning"},
    {"id":"z050","name":"Akola Limestone Zone","mineName":"Akola Lime Industries","district":"Akola","riskLevel":"yellow","riskScore":53,"latlngs":[[20.66,76.95],[20.75,76.95],[20.75,77.04],[20.66,77.04]],"soilType":"Limestone","slopeAngle":22,"lastLandslide":"2023-09-14","blastCount7d":4,"recentRainfall":101,"status":"monitoring"},
    {"id":"z051","name":"Murtizapur Quarry","mineName":"Murtizapur Rock Corp.","district":"Akola","riskLevel":"green","riskScore":19,"latlngs":[[20.76,77.00],[20.85,77.00],[20.85,77.09],[20.76,77.09]],"soilType":"Basalt","slopeAngle":11,"lastLandslide":"2022-03-05","blastCount7d":1,"recentRainfall":40,"status":"monitoring"},
    {"id":"z052","name":"Buldhana Limestone Belt","mineName":"Buldhana Mineral Co.","district":"Buldhana","riskLevel":"yellow","riskScore":49,"latlngs":[[20.48,76.13],[20.57,76.13],[20.57,76.22],[20.48,76.22]],"soilType":"Limestone","slopeAngle":21,"lastLandslide":"2023-07-30","blastCount7d":3,"recentRainfall":87,"status":"monitoring"},
    {"id":"z053","name":"Malkapur Stone Zone","mineName":"Malkapur Quarry Ops.","district":"Buldhana","riskLevel":"green","riskScore":28,"latlngs":[[20.58,76.18],[20.67,76.18],[20.67,76.27],[20.58,76.27]],"soilType":"Basalt","slopeAngle":14,"lastLandslide":"2022-09-12","blastCount7d":1,"recentRainfall":51,"status":"monitoring"},
    {"id":"z054","name":"Washim Basalt Quarry","mineName":"Washim Rock Industries","district":"Washim","riskLevel":"yellow","riskScore":45,"latlngs":[[20.06,77.08],[20.15,77.08],[20.15,77.17],[20.06,77.17]],"soilType":"Basalt","slopeAngle":18,"lastLandslide":"2023-06-17","blastCount7d":2,"recentRainfall":76,"status":"monitoring"},
    {"id":"z055","name":"Risod Mine Section","mineName":"Risod Mineral Extraction","district":"Washim","riskLevel":"green","riskScore":21,"latlngs":[[20.16,77.13],[20.25,77.13],[20.25,77.22],[20.16,77.22]],"soilType":"Alluvial","slopeAngle":12,"lastLandslide":"2022-02-28","blastCount7d":0,"recentRainfall":39,"status":"monitoring"},
    # ── Vidarbha (Nagpur Division) ───────────────────────────────────────
    {"id":"z056","name":"Gondia Manganese Zone A","mineName":"Gondia Ore Fields","district":"Gondia","riskLevel":"red","riskScore":88,"latlngs":[[21.41,80.15],[21.50,80.15],[21.50,80.24],[21.41,80.24]],"soilType":"Laterite","slopeAngle":44,"lastLandslide":"2025-02-15","blastCount7d":11,"recentRainfall":274,"status":"critical"},
    {"id":"z057","name":"Tirora Coal Block","mineName":"Tirora Coal Extraction","district":"Gondia","riskLevel":"orange","riskScore":72,"latlngs":[[21.51,80.20],[21.60,80.20],[21.60,80.29],[21.51,80.29]],"soilType":"Clay","slopeAngle":34,"lastLandslide":"2024-08-09","blastCount7d":8,"recentRainfall":168,"status":"warning"},
]

NEW_ALERTS = [
    {"id":"a025","zoneId":"z048","zoneName":"Amravati Manganese Block","district":"Amravati","riskLevel":"red","triggerReason":"ML model risk 85%. Slope 42° with 258mm rainfall. Blast count critical.","triggerSource":"rule_engine","recommendedAction":"Evacuate zone. Suspend all operations. Deploy rapid response.","status":"active"},
    {"id":"a026","zoneId":"z056","zoneName":"Gondia Manganese Zone A","district":"Gondia","riskLevel":"red","triggerReason":"Critical rainfall 274mm + steep slope 44°. Immediate hazard confirmed.","triggerSource":"ML Model v2","recommendedAction":"Evacuate zone. Suspend all operations. Deploy rapid response.","status":"active"},
    {"id":"a027","zoneId":"z028","zoneName":"Palghar Stone Quarry North","district":"Palghar","riskLevel":"orange","triggerReason":"Blast frequency exceeded safe threshold. Soil moisture rising.","triggerSource":"blast_threshold","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"active"},
    {"id":"a028","zoneId":"z034","zoneName":"Ahmednagar Basalt Zone A","district":"Ahmednagar","riskLevel":"orange","triggerReason":"Rainfall 132mm. Soil saturation risk rising on basalt face.","triggerSource":"rainfall_threshold","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"active"},
    {"id":"a029","zoneId":"z042","zoneName":"Beed Basalt Cut Zone A","district":"Beed","riskLevel":"orange","triggerReason":"Crack reports submitted. Slope face under stress.","triggerSource":"crack_confirmed","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"acknowledged"},
    {"id":"a030","zoneId":"z044","zoneName":"Latur Basalt Zone East","district":"Latur","riskLevel":"orange","triggerReason":"Blast count 7 in 7 days crossed orange threshold.","triggerSource":"blast_threshold","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"active"},
    {"id":"a031","zoneId":"z049","zoneName":"Achalpur Mine Zone","district":"Amravati","riskLevel":"orange","triggerReason":"Soil moisture sensor anomaly. Precautionary escalation triggered.","triggerSource":"rule_engine","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"acknowledged"},
    {"id":"a032","zoneId":"z057","zoneName":"Tirora Coal Block","district":"Gondia","riskLevel":"orange","triggerReason":"Rainfall 168mm with active excavation near unstable face.","triggerSource":"rainfall_threshold","recommendedAction":"Restrict heavy equipment. Increase monitoring to 4-hour intervals.","status":"acknowledged"},
]

# ── Append to existing files ──────────────────────────────────────────────
with open(os.path.join(DATA, "zones.json")) as f:
    zones = json.load(f)
zones += NEW_ZONES
with open(os.path.join(DATA, "zones.json"), "w") as f:
    json.dump(zones, f, indent=2)

with open(os.path.join(DATA, "alerts.json")) as f:
    alerts = json.load(f)
alerts += NEW_ALERTS
with open(os.path.join(DATA, "alerts.json"), "w") as f:
    json.dump(alerts, f, indent=2)

print(f"✅ zones.json  → {len(zones)} total zones")
print(f"✅ alerts.json → {len(alerts)} total alerts")
