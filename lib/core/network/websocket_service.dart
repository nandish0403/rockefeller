import 'dart:async';
import 'dart:convert';
import 'package:logger/logger.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'backend_endpoints.dart';
import '../storage/secure_storage.dart';

final _log = Logger(printer: PrettyPrinter(methodCount: 0, noBoxingByDefault: true));

enum WsEventType { notification, emergencyBroadcast, unknown }

class WsEvent {
  final WsEventType type;
  final Map<String, dynamic> data;

  const WsEvent({required this.type, required this.data});

  factory WsEvent.fromJson(Map<String, dynamic> json) {
    final rawType = (json['type'] ?? json['event'] ?? json['kind'] ?? '')
        .toString()
        .toLowerCase();

    final type = switch (rawType) {
      'notification' => WsEventType.notification,
      'alert' => WsEventType.notification,
      'new_alert' => WsEventType.notification,
      'crack_report_verified' => WsEventType.notification,
      'crack_report_reviewed' => WsEventType.notification,
      'report_verified' => WsEventType.notification,
      'emergency_broadcast' => WsEventType.emergencyBroadcast,
      'emergencybroadcast' => WsEventType.emergencyBroadcast,
      _ => WsEventType.unknown,
    };

    // Backend may wrap payload inside keys like `notification`, `payload`, or `data`.
    final wrapped = json['notification'] ?? json['payload'] ?? json['data'];
    final payload = wrapped is Map<String, dynamic> ? wrapped : json;

    return WsEvent(type: type, data: payload);
  }
}

class WebSocketService {
  WebSocketChannel? _channel;
  StreamController<WsEvent>? _controller;
  StreamController<bool>? _connectionController;
  String? _userId;
  bool _isConnected = false;
  int _retryCount = 0;
  Timer? _retryTimer;
  Timer? _heartbeatTimer;

  Stream<WsEvent> get events {
    _controller ??= StreamController<WsEvent>.broadcast();
    return _controller!.stream;
  }

  Stream<bool> get connectionChanges {
    _connectionController ??= StreamController<bool>.broadcast();
    return _connectionController!.stream;
  }

  bool get isConnected => _isConnected;

  Future<void> connect(String userId) async {
    _userId = userId;
    _controller ??= StreamController<WsEvent>.broadcast();
    await _connect();
  }

  Future<void> _connect() async {
    try {
      final token = await SecureStorage.readToken();
      if (token == null || _userId == null) return;

      final uri = buildUserWsUri(userId: _userId!, token: token);
      _channel = WebSocketChannel.connect(uri);

      _channel!.stream.listen(
        (message) {
          _retryCount = 0; // reset on successful message
          try {
            final json = jsonDecode(message as String) as Map<String, dynamic>;
            _controller?.add(WsEvent.fromJson(json));
          } catch (e) {
            _log.w('WS parse error: $e');
          }
        },
        onError: (error) {
          _log.e('WS error: $error');
          _isConnected = false;
          _connectionController?.add(false);
          _heartbeatTimer?.cancel();
          _scheduleReconnect();
        },
        onDone: () {
          _log.w('WS connection closed');
          _isConnected = false;
          _connectionController?.add(false);
          _heartbeatTimer?.cancel();
          _scheduleReconnect();
        },
      );

      _isConnected = true;
      _connectionController?.add(true);
      _startHeartbeat();
      _log.d('WS connected for user $_userId');
    } catch (e) {
      _log.e('WS connect failed: $e');
      _isConnected = false;
      _connectionController?.add(false);
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_userId == null) return;
    _retryTimer?.cancel();
    final delay = Duration(seconds: _exponentialBackoff(_retryCount));
    _log.d('WS reconnecting in ${delay.inSeconds}s (attempt ${_retryCount + 1})');
    _retryTimer = Timer(delay, () {
      _retryCount++;
      _connect();
    });
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (!_isConnected || _channel == null) return;
      try {
        _channel!.sink.add('ping');
      } catch (_) {
        _isConnected = false;
      }
    });
  }

  int _exponentialBackoff(int attempt) {
    const maxDelay = 60;
    return (1 << attempt).clamp(1, maxDelay);
  }

  void disconnect() {
    _retryTimer?.cancel();
    _heartbeatTimer?.cancel();
    _channel?.sink.close();
    _isConnected = false;
    _connectionController?.add(false);
    _log.d('WS disconnected');
  }

  void dispose() {
    disconnect();
    _controller?.close();
    _connectionController?.close();
  }
}
