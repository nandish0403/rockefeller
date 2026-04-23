import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/providers/app_providers.dart';
import '../core/providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import '../core/models/app_models.dart';

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
  OverlayEntry? _overlayEntry;
  Timer? _overlayTimer;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _overlayTimer?.cancel();
    _overlayEntry?.remove();
    super.dispose();
  }

  void _handleUiEvent(NotificationUiEvent event) {
    if (!mounted) return;

    if (event.isEmergency) {
      _showEmergencyDialog(event.payload);
      return;
    }

    if (event.navigateOnly) {
      context.go(event.navigatePath);
      return;
    }

    _showNotificationBanner(event);
  }

  void _showEmergencyDialog(Map<String, dynamic> data) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => _EmergencyDialog(data: data),
    );
  }

  void _showNotificationBanner(NotificationUiEvent event) {
    final title = event.title;
    final message = event.message;
    final type = event.type.toLowerCase();
    final accent = switch (type) {
      'alert' => AppTheme.errorRedHud,
      'warning' => AppTheme.amberWarning,
      _ => AppTheme.primary,
    };
    final sender = switch (type) {
      'alert' => 'Sentinel Emergency',
      'warning' => 'Sentinel Warning',
      _ => 'Sentinel Ops',
    };
    final text = message.isEmpty ? title : message;

    _overlayTimer?.cancel();
    _overlayEntry?.remove();

    final overlay = Overlay.of(context, rootOverlay: true);
    if (overlay == null) return;

    _overlayEntry = OverlayEntry(
      builder: (overlayContext) {
        final topPadding = MediaQuery.of(overlayContext).padding.top + 10;
        return Positioned(
          top: topPadding,
          left: 12,
          right: 12,
          child: Material(
            color: Colors.transparent,
            child: TweenAnimationBuilder<Offset>(
              duration: const Duration(milliseconds: 220),
              tween: Tween(begin: const Offset(0, -0.26), end: Offset.zero),
              curve: Curves.easeOutCubic,
              builder: (_, offset, child) => Transform.translate(
                offset: Offset(0, offset.dy * 100),
                child: child,
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () {
                  _overlayEntry?.remove();
                  _overlayEntry = null;
                  if (mounted) {
                    context.go(event.navigatePath);
                  }
                },
                child: Container(
                  padding: const EdgeInsets.fromLTRB(12, 10, 10, 10),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: accent.withValues(alpha: 0.56)),
                    boxShadow: [
                      BoxShadow(
                        color: accent.withValues(alpha: 0.16),
                        blurRadius: 16,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 17,
                        backgroundColor: accent.withValues(alpha: 0.2),
                        child: Icon(Icons.notifications_active_rounded, size: 17, color: accent),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              sender,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: accent,
                                fontFamily: 'SpaceGrotesk',
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppTheme.onSurface,
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              text,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppTheme.onSurfaceVariant,
                                fontFamily: 'Inter',
                                fontSize: 11.5,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.chevron_right_rounded, size: 18, color: AppTheme.onSurfaceVariant),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );

    overlay.insert(_overlayEntry!);
    _overlayTimer = Timer(const Duration(seconds: 4), () {
      _overlayEntry?.remove();
      _overlayEntry = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(
      notificationProvider.select((s) => s.uiEventVersion),
      (previous, current) {
        final event = ref.read(notificationProvider).latestUiEvent;
        if (event == null) return;
        _handleUiEvent(event);
      },
    );

    return widget.child;
  }
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
    return SafeArea(
      top: false,
      child: Container(
        height: 76,
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Icon(icon, color: color, size: 22),
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
          const SizedBox(height: 3),
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 8,
              fontWeight: _isActive ? FontWeight.w700 : FontWeight.w300,
              letterSpacing: 0.8,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
