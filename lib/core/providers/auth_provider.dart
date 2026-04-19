import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../storage/secure_storage.dart';
import '../models/app_models.dart';
import '../error/app_exception.dart';

// ── Global API Client Provider ────────────────────────────────────────────
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

// ── Auth State ────────────────────────────────────────────────────────────

sealed class AuthState {
  const AuthState();
}
class AuthInitial extends AuthState { const AuthInitial(); }
class AuthLoading extends AuthState { const AuthLoading(); }
class AuthAuthenticated extends AuthState {
  final UserModel user;
  const AuthAuthenticated(this.user);
}
class AuthUnauthenticated extends AuthState { const AuthUnauthenticated(); }
class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

// ── Auth Notifier ─────────────────────────────────────────────────────────
class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    // Kick off session restore after first frame
    Future.microtask(() => _restoreSession());
    return const AuthInitial();
  }

  ApiClient get _api => ref.read(apiClientProvider);

  Future<void> _restoreSession() async {
    state = const AuthLoading();
    try {
      final token = await SecureStorage.readToken();
      if (token == null) {
        state = const AuthUnauthenticated();
        return;
      }
      final data = await _api.get('/api/auth/me') as Map<String, dynamic>;
      final user = UserModel.fromJson(data);
      await SecureStorage.writeUserId(user.id);
      await SecureStorage.writeRole(user.role.name);
      state = AuthAuthenticated(user);
    } on UnauthorizedException {
      await SecureStorage.clearAll();
      state = const AuthUnauthenticated();
    } catch (_) {
      state = const AuthUnauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    state = const AuthLoading();
    try {
      final data = await _api.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      }) as Map<String, dynamic>;

      final token = data['access_token']?.toString() ?? data['token']?.toString();
      if (token == null) throw const ApiException(message: 'No token in response');

      await SecureStorage.writeToken(token);

      final meData = await _api.get('/api/auth/me') as Map<String, dynamic>;
      final user = UserModel.fromJson(meData);
      await SecureStorage.writeUserId(user.id);
      await SecureStorage.writeRole(user.role.name);
      state = AuthAuthenticated(user);
    } on AppException catch (e) {
      state = AuthError(e.message);
    } catch (e) {
      state = AuthError(e.toString());
    }
  }

  Future<void> logout() async {
    await SecureStorage.clearAll();
    state = const AuthUnauthenticated();
  }

  UserModel? get currentUser =>
      state is AuthAuthenticated ? (state as AuthAuthenticated).user : null;
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(() => AuthNotifier());

// ── Current User helper ───────────────────────────────────────────────────
final currentUserProvider = Provider<UserModel?>((ref) {
  final state = ref.watch(authProvider);
  return state is AuthAuthenticated ? state.user : null;
});

final currentRoleProvider = Provider<UserRole>((ref) {
  return ref.watch(currentUserProvider)?.role ?? UserRole.unknown;
});
