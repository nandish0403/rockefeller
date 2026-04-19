import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
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

// ── Notification State ─────────────────────────────────────────────────────
class NotificationState {
  final List<NotificationModel> notifications;
  final bool isLoading;
  final String? error;

  const NotificationState({
    this.notifications = const [],
    this.isLoading = false,
    this.error,
  });

  int get unreadCount => notifications.where((n) => !n.isRead).length;

  NotificationState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    String? error,
  }) => NotificationState(
    notifications: notifications ?? this.notifications,
    isLoading: isLoading ?? this.isLoading,
    error: error,
  );
}

class NotificationNotifier extends Notifier<NotificationState> {
  StreamSubscription<WsEvent>? _wsSubscription;
  Timer? _pollTimer;
  String? _connectedUserId;

  @override
  NotificationState build() {
    ref.onDispose(_disconnectWs);

    // Watch auth state and connect WS when authenticated
    ref.listen(authProvider, (prev, next) {
      if (next is AuthAuthenticated) {
        _connectWs(next.user.id);
        fetchNotifications();
      } else {
        _disconnectWs();
        state = const NotificationState();
      }
    });
    return const NotificationState();
  }

  ApiClient get _api => ref.read(apiClientProvider);
  WebSocketService get _ws => ref.read(wsServiceProvider);

  void _connectWs(String userId) {
    if (_connectedUserId == userId && _wsSubscription != null) return;

    _disconnectWs();
    _connectedUserId = userId;
    _ws.connect(userId);
    _startPolling();

    _wsSubscription = _ws.events.listen((event) {
      if (event.type == WsEventType.notification) {
        fetchNotifications(); // Re-fetch to sync
      }
      // Emergency broadcast is handled in the UI layer via stream listening
    });
  }

  void _disconnectWs() {
    _wsSubscription?.cancel();
    _wsSubscription = null;
    _pollTimer?.cancel();
    _pollTimer = null;
    _connectedUserId = null;
    _ws.disconnect();
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      if (_connectedUserId != null) {
        fetchNotifications();
      }
    });
  }

  Future<void> fetchNotifications() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _api.get('/api/notifications');
      final list = (data as List<dynamic>)
          .map((e) => NotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = state.copyWith(notifications: list, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
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
