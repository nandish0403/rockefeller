import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailCtrl    = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey      = GlobalKey<FormState>();
  bool _showPassword  = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authProvider.notifier).login(
      _emailCtrl.text.trim(),
      _passwordCtrl.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState is AuthLoading;
    final error     = authState is AuthError ? (authState).message : null;

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 64),
                  // ── Logo & Title ───────────────────────────────────────
                  Row(children: [
                    const Icon(Icons.security, color: AppTheme.errorRedHud, size: 28),
                    const SizedBox(width: 12),
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('ROCKEFELLER',
                        style: TextStyle(
                          fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: FontWeight.w700,
                          letterSpacing: 3, color: AppTheme.errorRedHud)),
                      const Text('SENTINEL',
                        style: TextStyle(
                          fontFamily: 'SpaceGrotesk', fontSize: 11, fontWeight: FontWeight.w300,
                          letterSpacing: 5, color: AppTheme.onSurfaceVariant)),
                    ]),
                  ]),
                  const SizedBox(height: 64),
                  // ── System Status Strip ────────────────────────────────
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    color: AppTheme.surfaceContainerLowest,
                    child: Row(children: [
                      Container(width: 6, height: 6,
                        decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)),
                      const SizedBox(width: 8),
                      const Text('SYS_STATUS: NOMINAL — MineSafe AI v4.2.0',
                        style: TextStyle(
                          fontFamily: 'Inter', fontSize: 9, letterSpacing: 1,
                          color: AppTheme.onSurfaceVariant)),
                    ]),
                  ),
                  const SizedBox(height: 48),
                  const Text('SECURE ACCESS',
                    style: TextStyle(
                      fontFamily: 'SpaceGrotesk', fontSize: 11, fontWeight: FontWeight.w700,
                      letterSpacing: 3, color: AppTheme.outline)),
                  const SizedBox(height: 32),
                  // ── Email ─────────────────────────────────────────────
                  SentinelTextField(
                    controller: _emailCtrl,
                    label: 'Email Address',
                    keyboardType: TextInputType.emailAddress,
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 24),
                  // ── Password ──────────────────────────────────────────
                  TextFormField(
                    controller: _passwordCtrl,
                    obscureText: !_showPassword,
                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    style: const TextStyle(color: AppTheme.onSurface, fontFamily: 'Inter', fontSize: 14),
                    decoration: InputDecoration(
                      labelText: 'PASSWORD',
                      labelStyle: const TextStyle(
                        fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w300,
                        letterSpacing: 1.5, color: Color(0xFF64748B)),
                      border: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                      focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary)),
                      enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                      contentPadding: const EdgeInsets.only(bottom: 8),
                      suffixIcon: GestureDetector(
                        onTap: () => setState(() => _showPassword = !_showPassword),
                        child: Icon(_showPassword ? Icons.visibility_off : Icons.visibility,
                          size: 18, color: const Color(0xFF64748B)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                  // ── Error ─────────────────────────────────────────────
                  if (error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      color: AppTheme.errorContainer,
                      child: Row(children: [
                        const Icon(Icons.error_outline, color: AppTheme.onErrorContainer, size: 14),
                        const SizedBox(width: 8),
                        Expanded(child: Text(error,
                          style: const TextStyle(
                            fontFamily: 'Inter', fontSize: 12,
                            color: AppTheme.onErrorContainer))),
                      ]),
                    ),
                    const SizedBox(height: 20),
                  ],
                  // ── Login Button ──────────────────────────────────────
                  SentinelButton(
                    label: 'Authenticate',
                    onTap: _login,
                    isLoading: isLoading,
                  ),
                  const SizedBox(height: 32),
                  // ── Footer ────────────────────────────────────────────
                  const Center(
                    child: Text('MINESAFE AI — PROTECTED SYSTEM',
                      style: TextStyle(
                        fontFamily: 'Inter', fontSize: 8, letterSpacing: 2,
                        color: Color(0xFF353534))),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
