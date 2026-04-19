import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/providers/app_providers.dart';
import '../core/providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import '../core/models/app_models.dart';
import '../core/network/websocket_service.dart';

/// Shell with bottom navigation bar — wraps all tab screens
class ShellScreen extends ConsumerWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).uri.toString();
    final role = ref.watch(currentRoleProvider);
    final notifState = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: _EmergencyBroadcastListener(child: child),
      bottomNavigationBar: _SentinelBottomNav(
        currentLocation: location,
        unreadCount: notifState.unreadCount,
        isAdmin: role.isAdmin,
      ),
    );
  }
}

// ── Emergency Broadcast Overlay ──────────────────────────────────────────
class _EmergencyBroadcastListener extends ConsumerStatefulWidget {
  final Widget child;
  const _EmergencyBroadcastListener({required this.child});

  @override
  ConsumerState<_EmergencyBroadcastListener> createState() =>
      _EmergencyBroadcastListenerState();
}

class _EmergencyBroadcastListenerState
    extends ConsumerState<_EmergencyBroadcastListener> {
  StreamSubscription<WsEvent>? _wsSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _listenToWs());
  }

  void _listenToWs() {
    final ws = ref.read(wsServiceProvider);
    _wsSubscription?.cancel();
    _wsSubscription = ws.events.listen((event) {
      if (event.type == WsEventType.emergencyBroadcast && mounted) {
        _showEmergencyDialog(event.data);
      } else if (event.type == WsEventType.notification && mounted) {
        _showNotificationBanner(event.data);
      }
    });
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }

  void _showEmergencyDialog(Map<String, dynamic> data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _EmergencyDialog(data: data),
    );
  }

  void _showNotificationBanner(Map<String, dynamic> data) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppTheme.surfaceContainerHigh,
        content: Row(
          children: [
            const Icon(Icons.notifications, color: AppTheme.primary, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                data['title']?.toString() ?? 'New notification',
                style: const TextStyle(color: AppTheme.onSurface, fontSize: 13),
              ),
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _EmergencyDialog extends StatelessWidget {
  final Map<String, dynamic> data;
  const _EmergencyDialog({required this.data});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppTheme.surfaceContainerHigh,
          border: Border.all(color: AppTheme.errorRedHud, width: 1),
          boxShadow: [BoxShadow(color: AppTheme.errorRedHud.withValues(alpha: 0.3), blurRadius: 30)],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.warning_rounded, color: AppTheme.errorRedHud, size: 20),
              const SizedBox(width: 8),
              Text('EMERGENCY BROADCAST',
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 11, fontWeight: FontWeight.w700,
                  letterSpacing: 1.5, color: AppTheme.errorRedHud)),
            ]),
            const SizedBox(height: 16),
            Text(data['title']?.toString() ?? 'Emergency Alert',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700,
                color: AppTheme.onSurface)),
            const SizedBox(height: 8),
            Text(data['message']?.toString() ?? '',
              style: const TextStyle(fontSize: 14, color: AppTheme.onSurfaceVariant, height: 1.5)),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryContainer,
                  foregroundColor: AppTheme.onPrimaryFixed,
                  shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                ),
                child: const Text('ACKNOWLEDGE', style: TextStyle(letterSpacing: 1.5, fontSize: 11, fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────

class _SentinelBottomNav extends StatelessWidget {
  final String currentLocation;
  final int unreadCount;
  final bool isAdmin;

  const _SentinelBottomNav({
    required this.currentLocation,
    required this.unreadCount,
    required this.isAdmin,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 72,
      color: AppTheme.background,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _NavItem(icon: Icons.dashboard, label: 'Dashboard', path: '/', currentLocation: currentLocation),
          _NavItem(icon: Icons.map, label: 'Map', path: '/map', currentLocation: currentLocation),
          _NavItem(icon: Icons.warning_rounded, label: 'Alerts', path: '/alerts',
              currentLocation: currentLocation, badgeCount: unreadCount > 0 ? unreadCount : null),
          _NavItem(icon: Icons.description, label: 'Reports', path: '/reports', currentLocation: currentLocation),
          _NavItem(icon: Icons.person, label: 'Profile', path: '/profile', currentLocation: currentLocation),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String path;
  final String currentLocation;
  final int? badgeCount;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.path,
    required this.currentLocation,
    this.badgeCount,
  });

  bool get _isActive => currentLocation == path || (path != '/' && currentLocation.startsWith(path));

  @override
  Widget build(BuildContext context) {
    final color = _isActive ? AppTheme.errorRedHud : const Color(0xFF64748B);
    return GestureDetector(
      onTap: () => context.go(path),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: 72,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(icon, color: color, size: 24),
                if (badgeCount != null && badgeCount! > 0)
                  Positioned(
                    right: -4, top: -4,
                    child: Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(label.toUpperCase(),
              style: TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontSize: 9, fontWeight: _isActive ? FontWeight.w700 : FontWeight.w300,
                letterSpacing: 0.8, color: color)),
          ],
        ),
      ),
    );
  }
}
