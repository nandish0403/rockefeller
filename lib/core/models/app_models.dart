import '../network/backend_endpoints.dart';

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
  'critical' => RiskLevel.high,
  'emergency' => RiskLevel.high,
  'red' => RiskLevel.high,
  'orange' => RiskLevel.high,
  'high'    => RiskLevel.high,
  'warning' => RiskLevel.medium,
  'amber' => RiskLevel.medium,
  'yellow' => RiskLevel.medium,
  'medium'  => RiskLevel.medium,
  'info' => RiskLevel.low,
  'green' => RiskLevel.low,
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

List<double>? _extractLatLngPair(dynamic value) {
  if (value is List) {
    if (value.length >= 2) {
      final lat = _numToDouble(value[0]);
      final lng = _numToDouble(value[1]);
      if (lat != null && lng != null) return [lat, lng];
    }
    for (final item in value) {
      final pair = _extractLatLngPair(item);
      if (pair != null) return pair;
    }
    return null;
  }

  if (value is Map<String, dynamic>) {
    final lat = _numToDouble(value['latitude'] ?? value['lat'] ?? value['y']);
    final lng = _numToDouble(
      value['longitude'] ?? value['lng'] ?? value['lon'] ?? value['long'] ?? value['x'],
    );
    if (lat != null && lng != null) return [lat, lng];

    for (final nested in value.values) {
      final pair = _extractLatLngPair(nested);
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

  final pairFromLatLngs = _extractLatLngPair(
    json['latlngs'] ?? json['lat_lngs'] ?? json['latlng'] ?? json['points'],
  );
  if (pairFromLatLngs != null) return pairFromLatLngs[0];

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

  final pairFromLatLngs = _extractLatLngPair(
    json['latlngs'] ?? json['lat_lngs'] ?? json['latlng'] ?? json['points'],
  );
  if (pairFromLatLngs != null) return pairFromLatLngs[1];

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
  'emergency' => AlertSeverity.critical,
  'high'     => AlertSeverity.critical,
  'critical' => AlertSeverity.critical,
  'medium'   => AlertSeverity.warning,
  'warning'  => AlertSeverity.warning,
  _          => AlertSeverity.info,
};

AlertStatus alertStatusFromString(String? s) => switch (s?.toLowerCase()) {
  'acknowledged' => AlertStatus.acknowledged,
  'resolved'     => AlertStatus.resolved,
  'closed'       => AlertStatus.resolved,
  _              => AlertStatus.active,
};

String? _nonEmptyString(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

String? _firstNonEmptyString(List<dynamic> values) {
  for (final value in values) {
    final text = _nonEmptyString(value);
    if (text != null) return text;
  }
  return null;
}

String? _stringFromObject(dynamic value) {
  if (value is Map<String, dynamic>) {
    return _firstNonEmptyString([
      value['name'],
      value['username'],
      value['title'],
      value['email'],
      value['id'],
      value['_id'],
    ]);
  }
  return _nonEmptyString(value);
}

String? _formatRiskProbability(dynamic value) {
  if (value == null) return null;
  if (value is num) {
    final n = value.toDouble();
    if (n <= 1) return '${(n * 100).toStringAsFixed(0)}%';
    return '${n.toStringAsFixed(0)}%';
  }
  return _nonEmptyString(value);
}

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
  final String? district;
  final String? sourceSensor;
  final String? riskProbability;
  final String? assignedTo;
  final String? recommendedAction;
  final String? severityLabel;
  final RiskLevel zoneRiskLevel;

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
    this.district,
    this.sourceSensor,
    this.riskProbability,
    this.assignedTo,
    this.recommendedAction,
    this.severityLabel,
    this.zoneRiskLevel = RiskLevel.unknown,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    final zone = json['zone'];
    final rawSeverity = _firstNonEmptyString([
      json['severity'],
      json['alert_level'],
      json['level'],
      json['risk_level'],
      json['priority'],
    ]);
    final zoneName = _firstNonEmptyString([
      json['zone_name'],
      json['zone_label'],
      zone is Map<String, dynamic> ? zone['name'] : null,
    ]);
    final fallbackTitle = _firstNonEmptyString([
      json['title'],
      json['trigger_title'],
      json['type'],
      zoneName,
      'Alert',
    ]);

    return AlertModel(
      id:          json['id']?.toString() ?? json['_id']?.toString() ?? '',
      title:       fallbackTitle ?? 'Alert',
      description: _firstNonEmptyString([
            json['description'],
            json['trigger_reason'],
            json['reason'],
            json['message'],
          ]) ??
          '',
      severity:    alertSeverityFromString(rawSeverity),
      status:      alertStatusFromString(json['status']?.toString()),
      zoneId:      _firstNonEmptyString([
        json['zone_id'],
        zone is Map<String, dynamic> ? zone['id'] : null,
        zone is Map<String, dynamic> ? zone['_id'] : null,
      ]),
      zoneName:    zoneName,
      location:    _firstNonEmptyString([
        json['location'],
        json['site'],
      ]),
      createdAt:   DateTime.tryParse(
        _firstNonEmptyString([
              json['created_at'],
              json['timestamp'],
              json['time'],
            ]) ??
            '',
      ),
      district: _firstNonEmptyString([
        json['district'],
        json['region'],
        zone is Map<String, dynamic> ? zone['district'] : null,
      ]),
      sourceSensor: _firstNonEmptyString([
        json['source_sensor'],
        json['source'],
        json['sensor'],
        json['trigger_source'],
      ]),
      riskProbability: _formatRiskProbability(
        json['risk_probability'] ??
            json['probability'] ??
            json['risk_score'],
      ),
      assignedTo: _firstNonEmptyString([
        _stringFromObject(json['assigned_to']),
        _stringFromObject(json['assignee']),
        _stringFromObject(json['assigned_user']),
      ]),
      recommendedAction: _firstNonEmptyString([
        json['recommended_action'],
        json['recommendedAction'],
        json['action'],
      ]),
      severityLabel: rawSeverity,
      zoneRiskLevel: riskFromString(_firstNonEmptyString([
        json['zone_risk_level'],
        json['risk_level'],
        json['alert_level'],
        zone is Map<String, dynamic> ? zone['risk_level'] : null,
        zone is Map<String, dynamic> ? zone['severity'] : null,
        rawSeverity,
      ])),
    );
  }
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
  final RiskLevel riskLevel;
  final String? severity;
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
    this.riskLevel = RiskLevel.unknown,
    this.severity,
    this.zoneId,
    this.zoneName,
    this.authorId,
    this.authorName,
    this.attachments = const [],
    this.createdAt,
  });

  static List<String> _extractAttachments(Map<String, dynamic> json) {
    final urls = <String>{};
    const keys = [
      'attachments',
      'images',
      'photos',
      'files',
      'media',
      'evidence',
      'image_urls',
      'photo_urls',
    ];

    for (final key in keys) {
      _collectMediaUrls(json[key], urls);
    }

    return urls.toList(growable: false);
  }

  static RiskLevel _extractRiskLevel(Map<String, dynamic> json) {
    final zone = json['zone'];
    return riskFromString(_firstNonEmptyString([
      json['risk_level'],
      json['severity'],
      json['alert_level'],
      zone is Map<String, dynamic> ? zone['risk_level'] : null,
      zone is Map<String, dynamic> ? zone['severity'] : null,
      json['status'],
    ]));
  }

  factory ReportModel.fromJson(Map<String, dynamic> json) => ReportModel(
    id:          json['id']?.toString() ?? json['_id']?.toString() ?? '',
    title:       _firstNonEmptyString([
                  json['title'],
                  json['name'],
                  json['report_type'],
                  'Untitled Report',
                ]) ??
                'Untitled Report',
    description: _firstNonEmptyString([
                  json['description'],
                  json['content'],
                  json['remarks'],
                  json['notes'],
                ]) ??
                '',
    status:      reportStatusFromString(json['status']?.toString()),
    riskLevel:   _extractRiskLevel(json),
    severity:    _firstNonEmptyString([
                  json['severity'],
                  json['risk_level'],
                  json['alert_level'],
                ]),
    zoneId:      _firstNonEmptyString([
                  json['zone_id'],
                  json['zone'] is Map<String, dynamic>
                      ? (json['zone'] as Map<String, dynamic>)['id']
                      : null,
                ]),
    zoneName:    _firstNonEmptyString([
                  json['zone_name'],
                  json['zone'] is Map<String, dynamic>
                      ? (json['zone'] as Map<String, dynamic>)['name']
                      : null,
                  json['district'],
                ]),
    authorId:    _firstNonEmptyString([
                  json['author_id'],
                  json['user_id'],
                  json['reported_by_id'],
                ]),
    authorName:  _firstNonEmptyString([
                  json['author_name'],
                  json['reported_by'],
                  json['submitted_by'],
                ]),
    attachments: _extractAttachments(json),
    createdAt:   DateTime.tryParse(
                  _firstNonEmptyString([
                        json['created_at'],
                        json['submitted_at'],
                        json['updated_at'],
                      ]) ??
                      '',
                ),
  );
}

// ── Crack Report Models ───────────────────────────────────────────────────

enum CrackReportStatus { pending, verified, reviewed }

CrackReportStatus crackStatusFromString(String? s) => switch (s?.toLowerCase()) {
  'verified' => CrackReportStatus.verified,
  'reviewed' => CrackReportStatus.reviewed,
  _          => CrackReportStatus.pending,
};

String _normalizeBackendMediaUrl(String raw) {
  return resolveBackendMediaUrl(raw);
}

void _collectMediaUrls(dynamic value, Set<String> out) {
  if (value == null) return;

  if (value is String) {
    final text = value.trim();
    if (text.isNotEmpty) out.add(_normalizeBackendMediaUrl(text));
    return;
  }

  if (value is List) {
    for (final item in value) {
      _collectMediaUrls(item, out);
    }
    return;
  }

  if (value is Map<String, dynamic>) {
    const urlKeys = [
      'url',
      'uri',
      'path',
      'file',
      'file_url',
      'image_url',
      'photo_url',
      'secure_url',
      'src',
    ];
    for (final key in urlKeys) {
      _collectMediaUrls(value[key], out);
    }

    const nestedKeys = ['photos', 'images', 'files', 'attachments', 'media'];
    for (final key in nestedKeys) {
      _collectMediaUrls(value[key], out);
    }
  }
}

List<String> _extractCrackReportPhotos(Map<String, dynamic> json) {
  final urls = <String>{};

  const keys = [
    'photos',
    'images',
    'image_urls',
    'photo_urls',
    'attachments',
    'media',
    'evidence',
    'image',
    'photo',
  ];

  for (final key in keys) {
    _collectMediaUrls(json[key], urls);
  }

  return urls.toList(growable: false);
}

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
        location:       _firstNonEmptyString([
                          json['location'],
                          json['zone_name'],
                          json['site'],
                          json['district'],
                        ]) ??
                        '',
        description:    _firstNonEmptyString([
                          json['description'],
                          json['notes'],
                          json['message'],
                        ]) ??
                        '',
        submissionMode: json['submission_mode']?.toString() ?? 'admin',
        status:         crackStatusFromString(json['status']?.toString()),
        severity:       _firstNonEmptyString([
                          json['severity'],
                          json['risk_level'],
                          json['alert_level'],
                        ]),
        zoneId:         json['zone_id']?.toString(),
        photos:         _extractCrackReportPhotos(json),
        createdAt:      DateTime.tryParse(
                          _firstNonEmptyString([
                                json['created_at'],
                                json['submitted_at'],
                                json['updated_at'],
                              ]) ??
                              '',
                        ),
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
  final int totalZones;
  final int criticalOrHigh;
  final int predictedToday;
  final double avgHazardScore;
  final bool model1Available;
  final Map<String, int> riskDistribution;

  const PredictionSummary({
    required this.totalZones,
    required this.criticalOrHigh,
    required this.predictedToday,
    required this.avgHazardScore,
    required this.model1Available,
    required this.riskDistribution,
  });

  static int _readCount(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      final value = json[key];
      if (value is num) return value.toInt();
      if (value is String) {
        final parsed = int.tryParse(value.trim());
        if (parsed != null) return parsed;
      }
    }
    return 0;
  }

  static Map<String, int> _readRiskDistribution(Map<String, dynamic> json) {
    final raw = json['risk_distribution'];
    if (raw is! Map<String, dynamic>) return <String, int>{};
    return raw.map((k, v) {
      if (v is num) return MapEntry(k, v.toInt());
      return MapEntry(k, int.tryParse(v.toString()) ?? 0);
    });
  }

  factory PredictionSummary.fromJson(Map<String, dynamic> json) => PredictionSummary(
        totalZones: _readCount(json, const ['total_zones', 'total']),
        criticalOrHigh: _readCount(json, const ['critical_or_high', 'high_risk_zones']),
        predictedToday: _readCount(json, const ['predicted_today']),
        avgHazardScore: _numToDouble(json['avg_hazard_score']) ?? 0,
        model1Available: json['model1_available'] as bool? ?? false,
        riskDistribution: _readRiskDistribution(json),
      );

  double get avgHazardFraction => (avgHazardScore / 100).clamp(0.0, 1.0);
}

class PredictionFactor {
  final String key;
  final String label;
  final dynamic value;
  final double impact;

  const PredictionFactor({
    required this.key,
    required this.label,
    required this.value,
    required this.impact,
  });

  factory PredictionFactor.fromJson(Map<String, dynamic> json) => PredictionFactor(
        key: json['key']?.toString() ?? 'factor',
        label: json['label']?.toString() ?? 'Factor',
        value: json['value'],
        impact: _numToDouble(json['impact']) ?? 0,
      );
}

class ZonePrediction {
  final String zoneId;
  final String zoneName;
  final String mineName;
  final String district;
  final RiskLevel currentRisk;
  final RiskLevel predictedRisk;
  final double currentRiskScore;
  final double predictedRiskScore;
  final double hazardScore;
  final List<double> forecastRainfall7dMm;
  final bool latestBlastAnomaly;
  final bool model1Available;
  final DateTime? predictedAt;
  final List<PredictionFactor> factorBreakdown;
  final String? recommendation;

  const ZonePrediction({
    required this.zoneId,
    required this.zoneName,
    required this.mineName,
    required this.district,
    required this.currentRisk,
    required this.predictedRisk,
    required this.currentRiskScore,
    required this.predictedRiskScore,
    required this.hazardScore,
    required this.forecastRainfall7dMm,
    required this.latestBlastAnomaly,
    required this.model1Available,
    required this.factorBreakdown,
    this.predictedAt,
    this.recommendation,
  });

  static List<double> _toDoubleList(dynamic raw) {
    if (raw is! List) return const [];
    return raw.map((e) => _numToDouble(e) ?? 0).toList(growable: false);
  }

  static List<PredictionFactor> _toFactors(dynamic raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(PredictionFactor.fromJson)
        .toList(growable: false);
  }

  factory ZonePrediction.fromJson(Map<String, dynamic> json) =>
      ZonePrediction(
        zoneId:         json['zone_id']?.toString() ?? '',
        zoneName:       json['zone_name']?.toString() ?? '',
        mineName:       json['mine_name']?.toString() ?? '-',
        district:       json['district']?.toString() ?? '-',
        currentRisk:    riskFromString(
          _firstNonEmptyString([json['current_risk_level'], json['current_risk']]) ?? '',
        ),
        predictedRisk:  riskFromString(
          _firstNonEmptyString([json['predicted_risk_level'], json['predicted_risk']]) ?? '',
        ),
        currentRiskScore: _numToDouble(json['current_risk_score']) ?? 0,
        predictedRiskScore: _numToDouble(json['predicted_risk_score']) ?? 0,
        hazardScore:    _numToDouble(json['hazard_score']) ?? 0,
        forecastRainfall7dMm: _toDoubleList(json['forecast_rainfall_7d_mm']),
        latestBlastAnomaly: json['latest_blast_anomaly'] as bool? ?? false,
        model1Available: json['model1_available'] as bool? ?? false,
        predictedAt: json['predicted_at'] != null
            ? DateTime.tryParse(json['predicted_at'].toString())
            : null,
        factorBreakdown: _toFactors(json['factor_breakdown']),
        recommendation: json['recommendation']?.toString(),
      );

  double get rainfallTotalMm =>
      forecastRainfall7dMm.fold<double>(0, (sum, val) => sum + val);
}
