import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:logger/logger.dart';

import '../network/api_client.dart';

final _log = Logger(printer: PrettyPrinter(methodCount: 0, noBoxingByDefault: true));

const AndroidNotificationChannel _alertsChannel = AndroidNotificationChannel(
  'alerts',
  'Alerts',
  description: 'High-priority operational alerts',
  importance: Importance.max,
);

final FlutterLocalNotificationsPlugin _localNotifications =
    FlutterLocalNotificationsPlugin();

bool _localNotificationsReady = false;
Future<void> Function(Map<String, dynamic> payload)? _onTapPayloadHandler;

Future<void> _ensureLocalNotificationsInitialized({
  Future<void> Function(Map<String, dynamic> payload)? onTapPayload,
}) async {
  if (onTapPayload != null) {
    _onTapPayloadHandler = onTapPayload;
  }

  if (_localNotificationsReady) return;

  const initSettings = InitializationSettings(
    android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    iOS: DarwinInitializationSettings(),
  );

  await _localNotifications.initialize(
    initSettings,
    onDidReceiveNotificationResponse: (response) async {
      if (_onTapPayloadHandler == null) return;
      final raw = response.payload;
      if (raw == null || raw.isEmpty) return;
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map<String, dynamic>) {
          await _onTapPayloadHandler!(decoded);
        }
      } catch (_) {}
    },
  );
  await _localNotifications
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_alertsChannel);

  _localNotificationsReady = true;
}

Map<String, dynamic> normalizePushPayload(Map<String, dynamic> data) {
  dynamic decodeIfJson(dynamic value) {
    if (value is! String) return value;
    final text = value.trim();
    if (text.isEmpty) return value;
    final looksJson =
        (text.startsWith('{') && text.endsWith('}')) ||
        (text.startsWith('[') && text.endsWith(']'));
    if (!looksJson) return value;
    try {
      return jsonDecode(text);
    } catch (_) {
      return value;
    }
  }

  final normalized = <String, dynamic>{};
  data.forEach((key, value) {
    normalized[key] = decodeIfJson(value);
  });

  final nested = normalized['notification'] ?? normalized['payload'] ?? normalized['data'];
  if (nested is Map<String, dynamic>) {
    for (final entry in nested.entries) {
      normalized.putIfAbsent(entry.key, () => entry.value);
    }
  }

  return normalized;
}

Map<String, dynamic> remoteMessageToPayload(RemoteMessage message) {
  final data = Map<String, dynamic>.from(message.data);
  final normalized = normalizePushPayload(data);

  final title = message.notification?.title ?? normalized['title']?.toString();
  final body = message.notification?.body ?? normalized['message']?.toString();

  if (title != null) normalized['title'] = title;
  if (body != null) normalized['message'] = body;

  return normalized;
}

Future<void> showLocalNotificationFromPayload(Map<String, dynamic> payload) async {
  await _ensureLocalNotificationsInitialized();

  final title = payload['title']?.toString() ?? 'Rockefeller Alert';
  final body = payload['message']?.toString() ?? 'New operational notification.';

  const details = NotificationDetails(
    android: AndroidNotificationDetails(
      'alerts',
      'Alerts',
      channelDescription: 'High-priority operational alerts',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
    ),
    iOS: DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    ),
  );

  await _localNotifications.show(
    DateTime.now().millisecondsSinceEpoch.remainder(100000),
    title,
    body,
    details,
    payload: jsonEncode(payload),
  );
}

Future<void> _safeInitializeFirebase() async {
  try {
    await Firebase.initializeApp();
  } catch (e) {
    _log.w('Firebase init skipped: $e');
  }
}

Future<void> initializePushMessagingCore() async {
  await _safeInitializeFirebase();
  try {
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (_) {}
  await _ensureLocalNotificationsInitialized();
}

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await _safeInitializeFirebase();
  final payload = remoteMessageToPayload(message);
  await showLocalNotificationFromPayload(payload);
}

class MobilePushService {
  MobilePushService(this._api);

  final ApiClient _api;

  bool _initialized = false;
  bool _firebaseReady = false;
  String? _lastRegisteredToken;
  StreamSubscription<RemoteMessage>? _onMessageSub;
  StreamSubscription<RemoteMessage>? _onOpenedSub;

  Future<void> initialize({
    required void Function(Map<String, dynamic> payload) onForeground,
    required void Function(Map<String, dynamic> payload) onOpened,
  }) async {
    if (_initialized) return;
    _initialized = true;

    await _safeInitializeFirebase();

    try {
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      _firebaseReady = true;
    } catch (e) {
      _firebaseReady = false;
      _log.w('FCM background handler unavailable: $e');
      return;
    }

    try {
      await _ensureLocalNotificationsInitialized(
        onTapPayload: (payload) async {
          onOpened(payload);
        },
      );

      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      _log.d('Push permission status: ${settings.authorizationStatus.name}');

      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      _onMessageSub = FirebaseMessaging.onMessage.listen((message) {
        final payload = remoteMessageToPayload(message);
        onForeground(payload);
      });

      _onOpenedSub = FirebaseMessaging.onMessageOpenedApp.listen((message) {
        final payload = remoteMessageToPayload(message);
        onOpened(payload);
      });

      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        onOpened(remoteMessageToPayload(initialMessage));
      }
    } catch (e) {
      _log.w('Push listener setup failed: $e');
    }
  }

  Future<void> registerTokenForCurrentSession() async {
    if (!_firebaseReady || kIsWeb) return;

    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) {
        _log.w('FCM token unavailable for this device/session');
        return;
      }
      if (_lastRegisteredToken == token) return;

      await _api.post('/api/push/subscribe', data: {
        'subscription': {
          'endpoint': 'fcm://$token',
          'keys': {'p256dh': token, 'auth': 'mobile'},
          'platform': 'flutter',
          'fcm_token': token,
        },
      });

      _lastRegisteredToken = token;
      _log.d('Push token registered for session');
    } catch (e) {
      _log.w('Push token registration failed: $e');
    }
  }

  Future<void> showLocalFallback(Map<String, dynamic> payload) async {
    await showLocalNotificationFromPayload(payload);
  }

  void dispose() {
    _onMessageSub?.cancel();
    _onOpenedSub?.cancel();
  }
}
