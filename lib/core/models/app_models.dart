// ── User / Auth Models ──────────────────────────────────────────────────

enum UserRole { admin, safetyOfficer, fieldWorker, unknown }

extension UserRoleX on UserRole {
  String get label => switch (this) {
    UserRole.admin        => 'Admin',
    UserRole.safetyOfficer => 'Safety Officer',
    UserRole.fieldWorker  => 'Field Worker',
    UserRole.unknown      => 'Unknown',
  };

  bool get canAcknowledge => this == UserRole.admin || this == UserRole.safetyOfficer;
  bool get canResolve     => this == UserRole.admin;
  bool get canBroadcast   => this == UserRole.admin;
  bool get isAdmin        => this == UserRole.admin;
}

UserRole roleFromString(String? s) => switch (s?.toLowerCase()) {
  'admin'          => UserRole.admin,
  'safety_officer' => UserRole.safetyOfficer,
  'field_worker'   => UserRole.fieldWorker,
  _                => UserRole.unknown,
};

class UserModel {
  final String id;
  final String name;
  final String email;
  final UserRole role;
  final String? site;
  final String? district;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.site,
    this.district,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) => UserModel(
    id:       json['id']?.toString()    ?? json['_id']?.toString() ?? '',
    name:     json['name']?.toString()  ?? json['username']?.toString() ?? '',
    email:    json['email']?.toString() ?? '',
    role:     roleFromString(json['role']?.toString()),
    site:     json['site']?.toString(),
    district: json['district']?.toString(),
  );
}

// ── Zone / Risk Models ───────────────────────────────────────────────────

enum RiskLevel { high, medium, low, nominal, unknown }

extension RiskLevelX on RiskLevel {
  String get label => name.toUpperCase();
  // Returns the risk integer used in API comparisons
}

RiskLevel riskFromString(String? s) => switch (s?.toLowerCase()) {
  'high'    => RiskLevel.high,
  'medium'  => RiskLevel.medium,
  'low'     => RiskLevel.low,
  'nominal' => RiskLevel.nominal,
  _         => RiskLevel.unknown,
};

double? _numToDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

List<double>? _extractLngLatPair(dynamic value) {
  if (value is List) {
    if (value.length >= 2) {
      final lng = _numToDouble(value[0]);
      final lat = _numToDouble(value[1]);
      if (lng != null && lat != null) return [lng, lat];
    }
    for (final item in value) {
      final pair = _extractLngLatPair(item);
      if (pair != null) return pair;
    }
    return null;
  }

  if (value is Map<String, dynamic>) {
    final lng = _numToDouble(
      value['longitude'] ?? value['lng'] ?? value['lon'] ?? value['long'] ?? value['x'],
    );
    final lat = _numToDouble(value['latitude'] ?? value['lat'] ?? value['y']);
    if (lng != null && lat != null) return [lng, lat];

    for (final nested in value.values) {
      final pair = _extractLngLatPair(nested);
      if (pair != null) return pair;
    }
  }

  return null;
}

double? _extractLatitude(Map<String, dynamic> json) {
  final direct = _numToDouble(
    json['latitude'] ?? json['lat'] ?? json['center_lat'] ?? json['center_latitude'],
  );
  if (direct != null) return direct;

  final pairFromCoordinates = _extractLngLatPair(json['coordinates']);
  if (pairFromCoordinates != null) return pairFromCoordinates[1];
  final pairFromGeometry = _extractLngLatPair(json['geometry']);
  if (pairFromGeometry != null) return pairFromGeometry[1];
  final pairFromGeoJson = _extractLngLatPair(json['geojson']);
  if (pairFromGeoJson != null) return pairFromGeoJson[1];

  final location = json['location'];
  if (location is Map<String, dynamic>) {
    final pairFromLocation = _extractLngLatPair(location);
    if (pairFromLocation != null) return pairFromLocation[1];
  }

  return null;
}

double? _extractLongitude(Map<String, dynamic> json) {
  final direct = _numToDouble(
    json['longitude'] ??
        json['lng'] ??
        json['lon'] ??
        json['long'] ??
        json['center_lng'] ??
        json['center_longitude'],
  );
  if (direct != null) return direct;

  final pairFromCoordinates = _extractLngLatPair(json['coordinates']);
  if (pairFromCoordinates != null) return pairFromCoordinates[0];
  final pairFromGeometry = _extractLngLatPair(json['geometry']);
  if (pairFromGeometry != null) return pairFromGeometry[0];
  final pairFromGeoJson = _extractLngLatPair(json['geojson']);
  if (pairFromGeoJson != null) return pairFromGeoJson[0];

  final location = json['location'];
  if (location is Map<String, dynamic>) {
    final pairFromLocation = _extractLngLatPair(location);
    if (pairFromLocation != null) return pairFromLocation[0];
  }

  return null;
}

class ZoneModel {
  final String id;
  final String name;
  final String district;
  final RiskLevel riskLevel;
  final double? latitude;
  final double? longitude;
  final double? stabilityIndex;
  final int? personnelCount;
  final String? sector;

  const ZoneModel({
    required this.id,
    required this.name,
    required this.district,
    required this.riskLevel,
    this.latitude,
    this.longitude,
    this.stabilityIndex,
    this.personnelCount,
    this.sector,
  });

  factory ZoneModel.fromJson(Map<String, dynamic> json) => ZoneModel(
    id:             json['id']?.toString() ?? json['_id']?.toString() ?? json['zone_id']?.toString() ?? '',
    name:           json['name']?.toString() ?? json['zone_name']?.toString() ?? 'Zone',
    district:       json['district']?.toString() ?? json['region']?.toString() ?? '',
    riskLevel:      riskFromString((json['risk_level'] ?? json['riskLevel'])?.toString()),
    latitude:       _extractLatitude(json),
    longitude:      _extractLongitude(json),
    stabilityIndex: (json['stability_index'] as num?)?.toDouble(),
    personnelCount: (json['personnel_count'] as num?)?.toInt(),
    sector:         json['sector']?.toString(),
  );
}

// ── Alert Models ─────────────────────────────────────────────────────────

enum AlertStatus { active, acknowledged, resolved }
enum AlertSeverity { critical, warning, info }

AlertSeverity alertSeverityFromString(String? s) => switch (s?.toLowerCase()) {
  'critical' => AlertSeverity.critical,
  'warning'  => AlertSeverity.warning,
  _          => AlertSeverity.info,
};

AlertStatus alertStatusFromString(String? s) => switch (s?.toLowerCase()) {
  'acknowledged' => AlertStatus.acknowledged,
  'resolved'     => AlertStatus.resolved,
  _              => AlertStatus.active,
};

class AlertModel {
  final String id;
  final String title;
  final String description;
  final AlertSeverity severity;
  final AlertStatus status;
  final String? zoneId;
  final String? zoneName;
  final String? location;
  final DateTime? createdAt;

  const AlertModel({
    required this.id,
    required this.title,
    required this.description,
    required this.severity,
    required this.status,
    this.zoneId,
    this.zoneName,
    this.location,
    this.createdAt,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) => AlertModel(
    id:          json['id']?.toString()    ?? json['_id']?.toString() ?? '',
    title:       json['title']?.toString() ?? json['type']?.toString() ?? 'Alert',
    description: json['description']?.toString() ?? json['message']?.toString() ?? '',
    severity:    alertSeverityFromString(json['severity']?.toString()),
    status:      alertStatusFromString(json['status']?.toString()),
    zoneId:      json['zone_id']?.toString(),
    zoneName:    json['zone_name']?.toString(),
    location:    json['location']?.toString(),
    createdAt:   json['created_at'] != null
        ? DateTime.tryParse(json['created_at'].toString())
        : null,
  );
}

// ── Notification Models ──────────────────────────────────────────────────

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final bool isRead;
  final String? type;
  final DateTime? createdAt;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.isRead,
    this.type,
    this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      NotificationModel(
        id:        json['id']?.toString() ?? json['_id']?.toString() ?? '',
        title:     json['title']?.toString() ?? 'Notification',
        message:   json['message']?.toString() ?? '',
        isRead:    json['is_read'] as bool? ?? false,
        type:      json['type']?.toString(),
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );

  NotificationModel copyWith({bool? isRead}) => NotificationModel(
    id: id, title: title, message: message,
    isRead: isRead ?? this.isRead,
    type: type, createdAt: createdAt,
  );
}

// ── Report Models ─────────────────────────────────────────────────────────

enum ReportStatus { pending, submitted, reviewed }

ReportStatus reportStatusFromString(String? s) => switch (s?.toLowerCase()) {
  'submitted' => ReportStatus.submitted,
  'reviewed'  => ReportStatus.reviewed,
  _           => ReportStatus.pending,
};

class ReportModel {
  final String id;
  final String title;
  final String description;
  final ReportStatus status;
  final String? zoneId;
  final String? zoneName;
  final String? authorId;
  final String? authorName;
  final List<String> attachments;
  final DateTime? createdAt;

  const ReportModel({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    this.zoneId,
    this.zoneName,
    this.authorId,
    this.authorName,
    this.attachments = const [],
    this.createdAt,
  });

  factory ReportModel.fromJson(Map<String, dynamic> json) => ReportModel(
    id:          json['id']?.toString() ?? json['_id']?.toString() ?? '',
    title:       json['title']?.toString() ?? '',
    description: json['description']?.toString() ?? json['content']?.toString() ?? '',
    status:      reportStatusFromString(json['status']?.toString()),
    zoneId:      json['zone_id']?.toString(),
    zoneName:    json['zone_name']?.toString(),
    authorId:    json['author_id']?.toString() ?? json['user_id']?.toString(),
    authorName:  json['author_name']?.toString(),
    attachments: (json['attachments'] as List<dynamic>?)
        ?.map((e) => e.toString()).toList() ?? [],
    createdAt:   json['created_at'] != null
        ? DateTime.tryParse(json['created_at'].toString())
        : null,
  );
}

// ── Crack Report Models ───────────────────────────────────────────────────

enum CrackReportStatus { pending, verified, reviewed }

CrackReportStatus crackStatusFromString(String? s) => switch (s?.toLowerCase()) {
  'verified' => CrackReportStatus.verified,
  'reviewed' => CrackReportStatus.reviewed,
  _          => CrackReportStatus.pending,
};

class CrackReportModel {
  final String id;
  final String location;
  final String description;
  final String submissionMode;
  final CrackReportStatus status;
  final String? severity;
  final String? zoneId;
  final List<String> photos;
  final DateTime? createdAt;

  const CrackReportModel({
    required this.id,
    required this.location,
    required this.description,
    required this.submissionMode,
    required this.status,
    this.severity,
    this.zoneId,
    this.photos = const [],
    this.createdAt,
  });

  factory CrackReportModel.fromJson(Map<String, dynamic> json) =>
      CrackReportModel(
        id:             json['id']?.toString() ?? json['_id']?.toString() ?? '',
        location:       json['location']?.toString() ?? '',
        description:    json['description']?.toString() ?? '',
        submissionMode: json['submission_mode']?.toString() ?? 'admin',
        status:         crackStatusFromString(json['status']?.toString()),
        severity:       json['severity']?.toString(),
        zoneId:         json['zone_id']?.toString(),
        photos: (json['photos'] as List<dynamic>?)
            ?.map((e) => e.toString()).toList() ?? [],
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}

// ── Blast Models ──────────────────────────────────────────────────────────

class BlastModel {
  final String id;
  final String zoneId;
  final String? zoneName;
  final String blastType;
  final String? anomalyStatus;
  final String? notes;
  final DateTime? scheduledAt;
  final DateTime? createdAt;

  const BlastModel({
    required this.id,
    required this.zoneId,
    required this.blastType,
    this.zoneName,
    this.anomalyStatus,
    this.notes,
    this.scheduledAt,
    this.createdAt,
  });

  factory BlastModel.fromJson(Map<String, dynamic> json) => BlastModel(
    id:            json['id']?.toString() ?? json['_id']?.toString() ?? '',
    zoneId:        json['zone_id']?.toString() ?? '',
    zoneName:      json['zone_name']?.toString(),
    blastType:     json['blast_type']?.toString() ?? 'surface',
    anomalyStatus: json['anomaly_status']?.toString(),
    notes:         json['notes']?.toString(),
    scheduledAt:   json['scheduled_at'] != null
        ? DateTime.tryParse(json['scheduled_at'].toString())
        : null,
    createdAt:     json['created_at'] != null
        ? DateTime.tryParse(json['created_at'].toString())
        : null,
  );
}

// ── Exploration Models ────────────────────────────────────────────────────

class ExplorationModel {
  final String id;
  final String zoneId;
  final String? zoneName;
  final String findings;
  final double? depth;
  final DateTime? exploredAt;
  final DateTime? createdAt;

  const ExplorationModel({
    required this.id,
    required this.zoneId,
    required this.findings,
    this.zoneName,
    this.depth,
    this.exploredAt,
    this.createdAt,
  });

  factory ExplorationModel.fromJson(Map<String, dynamic> json) =>
      ExplorationModel(
        id:         json['id']?.toString() ?? json['_id']?.toString() ?? '',
        zoneId:     json['zone_id']?.toString() ?? '',
        zoneName:   json['zone_name']?.toString(),
        findings:   json['findings']?.toString() ?? '',
        depth:      (json['depth'] as num?)?.toDouble(),
        exploredAt: json['explored_at'] != null
            ? DateTime.tryParse(json['explored_at'].toString())
            : null,
        createdAt:  json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString())
            : null,
      );
}

// ── Prediction Models ─────────────────────────────────────────────────────

class PredictionSummary {
  final double overallRisk;
  final int highRiskZones;
  final String forecastPeriod;
  final String confidence;

  const PredictionSummary({
    required this.overallRisk,
    required this.highRiskZones,
    required this.forecastPeriod,
    required this.confidence,
  });

  factory PredictionSummary.fromJson(Map<String, dynamic> json) =>
      PredictionSummary(
        overallRisk:    (json['overall_risk'] as num?)?.toDouble() ?? 0,
        highRiskZones:  (json['high_risk_zones'] as num?)?.toInt() ?? 0,
        forecastPeriod: json['forecast_period']?.toString() ?? '24h',
        confidence:     json['confidence']?.toString() ?? 'N/A',
      );
}

class ZonePrediction {
  final String zoneId;
  final String zoneName;
  final RiskLevel predictedRisk;
  final double probability;
  final String? recommendation;

  const ZonePrediction({
    required this.zoneId,
    required this.zoneName,
    required this.predictedRisk,
    required this.probability,
    this.recommendation,
  });

  factory ZonePrediction.fromJson(Map<String, dynamic> json) =>
      ZonePrediction(
        zoneId:         json['zone_id']?.toString() ?? '',
        zoneName:       json['zone_name']?.toString() ?? '',
        predictedRisk:  riskFromString(json['predicted_risk']?.toString()),
        probability:    (json['probability'] as num?)?.toDouble() ?? 0,
        recommendation: json['recommendation']?.toString(),
      );
}
