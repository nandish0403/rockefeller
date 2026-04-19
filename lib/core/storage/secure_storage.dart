import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  static const _keyToken  = 'jwt_token';
  static const _keyUserId = 'user_id';
  static const _keyRole   = 'user_role';

  // ── Token ──────────────────────────────────────────────────────────────
  static Future<void> writeToken(String token) =>
      _storage.write(key: _keyToken, value: token);

  static Future<String?> readToken() => _storage.read(key: _keyToken);

  static Future<void> deleteToken() => _storage.delete(key: _keyToken);

  // ── User ID ────────────────────────────────────────────────────────────
  static Future<void> writeUserId(String id) =>
      _storage.write(key: _keyUserId, value: id);

  static Future<String?> readUserId() => _storage.read(key: _keyUserId);

  // ── Role ───────────────────────────────────────────────────────────────
  static Future<void> writeRole(String role) =>
      _storage.write(key: _keyRole, value: role);

  static Future<String?> readRole() => _storage.read(key: _keyRole);

  // ── Clear All ──────────────────────────────────────────────────────────
  static Future<void> clearAll() => _storage.deleteAll();
}
