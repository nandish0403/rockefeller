import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../notifications/mobile_push_service.dart';
import '../network/api_client.dart';
import '../network/websocket_service.dart';
import '../models/app_models.dart';
import 'auth_provider.dart';

// ── WebSocket Service Provider ────────────────────────────────────────────
final wsServiceProvider = Provider<WebSocketService>((ref) {
  final ws = WebSocketService();
  ref.onDispose(ws.dispose);
  return ws;
});

final mobilePushServiceProvider = Provider<MobilePushService>((ref) {
  final service = MobilePushService(ref.read(apiClientProvider));
  ref.onDispose(service.dispose);
  return service;
});

// ── Notification State ─────────────────────────────────────────────────────
class NotificationUiEvent {
  final String key;
  final String title;
  final String message;
  final String type;
  final bool isEmergency;
  final bool navigateOnly;
  final String navigatePath;
  final Map<String, dynamic> payload;

  const NotificationUiEvent({
    required this.key,
    required this.title,
    required this.message,
    required this.type,
    required this.isEmergency,
    required this.navigateOnly,
    required this.navigatePath,
    required this.payload,
  });
}

class NotificationState {
  final List<NotificationModel> notifications;
  final bool isLoading;
  final String? error;
  final NotificationUiEvent? latestUiEvent;
  final int uiEventVersion;
  final DateTime? lastSyncAt;

  const NotificationState({
    this.notifications = const [],
    this.isLoading = false,
    this.error,
    this.latestUiEvent,
    this.uiEventVersion = 0,
    this.lastSyncAt,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    String? error,
    NotificationUiEvent? latestUiEvent,
    bool keepUiEvent = true,
    int? uiEventVersion,
    DateTime? lastSyncAt,
  }) => NotificationState(
    notifications: notifications ?? this.notifications,
    isLoading: isLoading ?? this.isLoading,
    error: error,
    latestUiEvent: keepUiEvent ? (latestUiEvent ?? this.latestUiEvent) : latestUiEvent,
    uiEventVersion: uiEventVersion ?? this.uiEventVersion,
    lastSyncAt: lastSyncAt ?? this.lastSyncAt,
  );
}

class NotificationNotifier extends Notifier<NotificationState> {
  StreamSubscription<WsEvent>? _wsSubscription;
  StreamSubscription<bool>? _wsConnectionSubscription;
  Timer? _pollTimer;
  String? _connectedUserId;
  final List<String> _recentEventKeys = <String>[];
  bool _pushListenersReady = false;

  @override
  NotificationState build() {
    ref.onDispose(() {
      _disconnectWs();
    });

    // Watch auth state and connect WS when authenticated
    ref.listen(authProvider, (prev, next) {
      if (next is AuthAuthenticated) {
        _connectWs(next.user.id);
        unawaited(fetchNotifications(silent: true));
        unawaited(_initializePushListeners());
        unawaited(_registerPushTokenForSession());
      } else {
        _disconnectWs();
        state = const NotificationState();
      }
    });
    return const NotificationState();
  }

  ApiClient get _api => ref.read(apiClientProvider);
  WebSocketService get _ws => ref.read(wsServiceProvider);
  MobilePushService get _pushService => ref.read(mobilePushServiceProvider);

  void _connectWs(String userId) {
    if (_connectedUserId == userId && _wsSubscription != null && _wsConnectionSubscription != null) {
      return;
    }

    _disconnectWs();
    _connectedUserId = userId;
    unawaited(_ws.connect(userId));
    _startPolling();

    _wsSubscription = _ws.events.listen((event) {
      if (event.type == WsEventType.notification) {
        _handleIncomingNotificationPayload(event.data);
        unawaited(fetchNotifications(silent: true));
        return;
      }

      if (event.type == WsEventType.emergencyBroadcast) {
        _emitUiEvent(
          payload: event.data,
          isEmergency: true,
          navigateOnly: false,
        );
      }
    });

    _wsConnectionSubscription = _ws.connectionChanges.listen((connected) {
      if (connected) {
        unawaited(fetchNotifications(silent: true));
      }
    });
  }

  void _disconnectWs() {
    _wsSubscription?.cancel();
    _wsSubscription = null;
    _wsConnectionSubscription?.cancel();
    _wsConnectionSubscription = null;
    _pollTimer?.cancel();
    _pollTimer = null;
    _connectedUserId = null;
    _ws.disconnect();
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (_connectedUserId != null && !_ws.isConnected) {
        unawaited(fetchNotifications(silent: true));
      }
    });
  }

  Future<void> _initializePushListeners() async {
    if (_pushListenersReady) return;

    await _pushService.initialize(
      onForeground: (payload) {
        _handleIncomingNotificationPayload(payload);
      },
      onOpened: (payload) {
        _handleIncomingNotificationPayload(
          payload,
          navigateOnly: true,
        );
      },
    );

    _pushListenersReady = true;
  }

  Future<void> _registerPushTokenForSession() async {
    await _pushService.registerTokenForCurrentSession();
  }

  Future<void> fetchNotifications({bool silent = false}) async {
    if (!silent) {
      state = state.copyWith(isLoading: true, error: null);
    }

    try {
      final data = await _api.get('/api/notifications');
      final list = (data as List<dynamic>)
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .where((n) => n.id.isNotEmpty)
          .toList()
        ..sort((a, b) {
          final at = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final bt = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return bt.compareTo(at);
        });

      state = state.copyWith(
        notifications: list,
        isLoading: false,
        error: null,
        lastSyncAt: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> handleNotificationTap(NotificationModel notification) async {
    await markRead(notification.id);
    _emitUiEvent(
      payload: {
        'id': notification.id,
        'title': notification.title,
        'message': notification.message,
        'type': notification.type,
        'zone_id': notification.zoneId,
      },
      isEmergency: false,
      navigateOnly: true,
    );
  }

  void _handleIncomingNotificationPayload(
    Map<String, dynamic> rawPayload, {
    bool navigateOnly = false,
  }) {
    final payload = normalizePushPayload(rawPayload);
    final isEmergency = _isEmergencyPayload(payload);

    if (!isEmergency) {
      final incoming = NotificationModel.fromJson(payload);
      if (incoming.id.isNotEmpty) {
        final merged = _upsertNotification(incoming);
        state = state.copyWith(notifications: merged, error: null);
      }
    }

    _emitUiEvent(
      payload: payload,
      isEmergency: isEmergency,
      navigateOnly: navigateOnly,
    );
  }

  bool _isEmergencyPayload(Map<String, dynamic> payload) {
    final event = (payload['event'] ?? payload['type'] ?? '').toString().toLowerCase();
    if (event == 'emergency_broadcast') return true;
    final title = (payload['title'] ?? '').toString().toLowerCase();
    return title.contains('emergency');
  }

  List<NotificationModel> _upsertNotification(NotificationModel incoming) {
    final current = state.notifications;
    final idx = current.indexWhere((n) => n.id == incoming.id);
    final next = [...current];

    if (idx >= 0) {
      next[idx] = incoming;
    } else {
      next.insert(0, incoming);
    }

    next.sort((a, b) {
      final at = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      final bt = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
      return bt.compareTo(at);
    });

    return next;
  }

  void _emitUiEvent({
    required Map<String, dynamic> payload,
    required bool isEmergency,
    required bool navigateOnly,
  }) {
    final key = _eventKey(payload, isEmergency: isEmergency);
    if (!_rememberEventKey(key, navigateOnly: navigateOnly)) {
      return;
    }

    final title = payload['title']?.toString() ??
        (isEmergency ? 'Emergency Broadcast' : 'New notification');
    final message = payload['message']?.toString() ?? '';
    final type = payload['type']?.toString() ?? (isEmergency ? 'warning' : 'info');
    final navigatePath = _resolveNavigationPath(payload, isEmergency: isEmergency);

    final uiEvent = NotificationUiEvent(
      key: key,
      title: title,
      message: message,
      type: type,
      isEmergency: isEmergency,
      navigateOnly: navigateOnly,
      navigatePath: navigatePath,
      payload: payload,
    );

    state = state.copyWith(
      latestUiEvent: uiEvent,
      uiEventVersion: state.uiEventVersion + 1,
      keepUiEvent: false,
    );
  }

  bool _rememberEventKey(String key, {required bool navigateOnly}) {
    if (_recentEventKeys.contains(key)) {
      // Taps from system tray should still navigate even if event already appeared.
      return navigateOnly;
    }
    _recentEventKeys.add(key);
    if (_recentEventKeys.length > 200) {
      _recentEventKeys.removeAt(0);
    }
    return true;
  }

  String _eventKey(Map<String, dynamic> payload, {required bool isEmergency}) {
    final id = payload['id']?.toString() ??
        payload['_id']?.toString() ??
        payload['alert_id']?.toString() ??
        payload['notification_id']?.toString();
    if (id != null && id.isNotEmpty) {
      return '${isEmergency ? 'emergency' : 'notification'}:$id';
    }

    final title = payload['title']?.toString() ?? '';
    final message = payload['message']?.toString() ?? '';
    final created = payload['created_at']?.toString() ?? '';
    return '${isEmergency ? 'emergency' : 'notification'}:$title|$message|$created';
  }

  String _resolveNavigationPath(Map<String, dynamic> payload, {required bool isEmergency}) {
    if (isEmergency) return '/';

    final crackId = _firstNonEmptyValue([
      payload['crack_report_id'],
      payload['crack_id'],
      payload['report_id'],
    ]);
    if (crackId != null) {
      return '/crack-reports/${Uri.encodeComponent(crackId)}';
    }

    final alertId = _firstNonEmptyValue([
      payload['alert_id'],
      payload['id'],
    ]);
    final type = (payload['type'] ?? '').toString().toLowerCase();
    final title = (payload['title'] ?? '').toString().toLowerCase();

    if ((type == 'alert' || title.contains('alert')) && alertId != null) {
      return '/alerts/${Uri.encodeComponent(alertId)}';
    }
    if (type == 'alert' || title.contains('alert')) {
      return '/alerts';
    }

    return '/notifications';
  }

  String? _firstNonEmptyValue(List<dynamic> values) {
    for (final value in values) {
      if (value == null) continue;
      final text = value.toString().trim();
      if (text.isNotEmpty) return text;
    }
    return null;
  }

  Future<void> markRead(String id) async {
    try {
      await _api.patch('/api/notifications/$id/read');
      state = state.copyWith(
        notifications: state.notifications
            .map((n) => n.id == id ? n.copyWith(isRead: true) : n)
            .toList(),
      );
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      await _api.patch('/api/notifications/read-all');
      state = state.copyWith(
        notifications: state.notifications
            .map((n) => n.copyWith(isRead: true))
            .toList(),
      );
    } catch (_) {}
  }
}

final notificationProvider =
    NotifierProvider<NotificationNotifier, NotificationState>(
        () => NotificationNotifier());

List<dynamic> _extractListPayload(
  dynamic data, {
  List<String> preferredKeys = const [],
  bool allowSingleObject = false,
}) {
  final normalized = _decodePossiblyJsonString(data);

  if (normalized is List<dynamic>) return normalized;
  if (normalized is Map<String, dynamic>) {
    for (final key in preferredKeys) {
      final candidate = _decodePossiblyJsonString(normalized[key]);
      if (candidate is List<dynamic>) return candidate;
      if (allowSingleObject && candidate is Map<String, dynamic>) return [candidate];
    }
    final fallback = _decodePossiblyJsonString(normalized['data']);
    if (fallback is List<dynamic>) return fallback;
    if (allowSingleObject && fallback is Map<String, dynamic>) return [fallback];

    // Some APIs return a single object directly instead of a list.
    if (allowSingleObject && _looksLikeEntity(normalized)) {
      return [normalized];
    }

    // Last resort: if any top-level value is a list/map payload, use it.
    for (final value in normalized.values) {
      final candidate = _decodePossiblyJsonString(value);
      if (candidate is List<dynamic>) return candidate;
      if (allowSingleObject && candidate is Map<String, dynamic>) return [candidate];
    }
  }
  return const [];
}

dynamic _decodePossiblyJsonString(dynamic value) {
  if (value is! String) return value;
  final text = value.trim();
  if (text.isEmpty) return value;
  final looksJson =
      (text.startsWith('{') && text.endsWith('}')) ||
      (text.startsWith('[') && text.endsWith(']'));
  if (!looksJson) return value;

  try {
    final decoded = jsonDecode(text);
    // Handle double-encoded payloads.
    if (decoded is String && decoded != value) {
      return _decodePossiblyJsonString(decoded);
    }
    return decoded;
  } catch (_) {
    return value;
  }
}

bool _looksLikeEntity(Map<String, dynamic> json) {
  const keys = {
    'id',
    '_id',
    'zone_id',
    'name',
    'zone_name',
    'title',
    'latitude',
    'longitude',
    'coordinates',
  };
  return json.keys.any(keys.contains);
}

Iterable<Map<String, dynamic>> _mapItems(List<dynamic> list) sync* {
  for (final item in list) {
    final decoded = _decodePossiblyJsonString(item);
    if (decoded is Map<String, dynamic>) {
      yield decoded;
    }
  }
}

// ── Zones Provider ────────────────────────────────────────────────────────
final zonesProvider = FutureProvider<List<ZoneModel>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/zones');
  final list = _extractListPayload(
    data,
    preferredKeys: const ['zones', 'items', 'results'],
    allowSingleObject: true,
  );
  return _mapItems(list)
      .map(ZoneModel.fromJson)
      .toList();
});

// ── Alerts Provider ────────────────────────────────────────────────────────
final alertsProvider = FutureProvider.family<List<AlertModel>, String?>((ref, status) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/alerts',
      queryParameters: status != null ? {'status': status} : null);
  final list = _extractListPayload(
    data,
    preferredKeys: const ['alerts', 'items', 'results'],
    allowSingleObject: true,
  );
  return _mapItems(list)
      .map(AlertModel.fromJson)
      .toList();
});

final alertDetailProvider = FutureProvider.family<AlertModel?, String>((ref, alertId) async {
  final api = ref.read(apiClientProvider);
  try {
    final data = await api.get('/api/alerts/$alertId');
    if (data is Map<String, dynamic>) {
      return AlertModel.fromJson(data);
    }
    return null;
  } catch (_) {
    return null;
  }
});

// ── Reports Provider ───────────────────────────────────────────────────────
final reportsProvider = FutureProvider<List<ReportModel>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/reports');
  return (data as List<dynamic>)
      .map((e) => ReportModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

final reportDetailProvider = FutureProvider.family<ReportModel, String>((ref, reportId) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/reports/$reportId');
  return ReportModel.fromJson(data as Map<String, dynamic>);
});

// ── Crack Reports Provider ─────────────────────────────────────────────────
final crackReportsProvider = FutureProvider<List<CrackReportModel>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/crack-reports');
  return (data as List<dynamic>)
      .map((e) => CrackReportModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

final crackReportDetailProvider =
    FutureProvider.family<CrackReportModel, String>((ref, reportId) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/crack-reports/$reportId');
  return CrackReportModel.fromJson(data as Map<String, dynamic>);
});

// ── Blasts Provider ────────────────────────────────────────────────────────
final blastsProvider = FutureProvider<List<BlastModel>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/blasts');
  return (data as List<dynamic>)
      .map((e) => BlastModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Explorations Provider ──────────────────────────────────────────────────
final explorationsProvider = FutureProvider<List<ExplorationModel>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/explorations');
  return (data as List<dynamic>)
      .map((e) => ExplorationModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Prediction Summary Provider ────────────────────────────────────────────
final predictionSummaryProvider = FutureProvider<PredictionSummary>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/predictions/summary');
  return PredictionSummary.fromJson(data as Map<String, dynamic>);
});

final zonePredictionsProvider = FutureProvider<List<ZonePrediction>>((ref) async {
  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/predictions/zones');
  final list = _extractListPayload(
    data,
    preferredKeys: const ['zones', 'items', 'results'],
    allowSingleObject: true,
  );
  return _mapItems(list)
      .map(ZonePrediction.fromJson)
      .toList();
});

final zonePredictionDetailProvider =
    FutureProvider.family<ZonePrediction?, String?>((ref, zoneId) async {
  final id = zoneId?.trim();
  if (id == null || id.isEmpty) return null;

  final api = ref.read(apiClientProvider);
  final data = await api.get('/api/predictions/zones/$id');
  if (data is Map<String, dynamic>) {
    return ZonePrediction.fromJson(data);
  }
  final decoded = _decodePossiblyJsonString(data);
  if (decoded is Map<String, dynamic>) {
    return ZonePrediction.fromJson(decoded);
  }
  return null;
});
