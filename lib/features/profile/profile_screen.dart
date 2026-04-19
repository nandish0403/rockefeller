import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user  = ref.watch(currentUserProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(
        unreadNotifications: notif.unreadCount,
        onNotificationTap: () => context.go('/notifications'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // ── Avatar + Name ──────────────────────────────────────────────
          Row(children: [
            Container(
              width: 64, height: 64,
              color: AppTheme.surfaceContainerHigh,
              child: const Icon(Icons.person, size: 32, color: Color(0xFF64748B))),
            const SizedBox(width: 16),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(user?.name.toUpperCase() ?? '—',
                style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 18,
                  fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                color: AppTheme.primaryContainer,
                child: Text(user?.role.label.toUpperCase() ?? '—',
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                    letterSpacing: 1.5, color: AppTheme.onPrimaryFixed)),
              ),
            ]),
          ]),

          const SizedBox(height: 28),
          Container(height: 1, color: AppTheme.outlineVariant.withValues(alpha: 0.2)),
          const SizedBox(height: 20),

          // ── Info Rows ─────────────────────────────────────────────────
          _InfoRow(label: 'Email', value: user?.email ?? '—'),
          _InfoRow(label: 'Site', value: user?.site ?? '—'),
          _InfoRow(label: 'District', value: user?.district ?? '—'),
          _InfoRow(label: 'User ID', value: user?.id ?? '—'),

          const SizedBox(height: 28),

          // ── Navigation Links ──────────────────────────────────────────
          _NavLink(label: 'Alerts Feed', icon: Icons.warning_rounded, onTap: () => context.go('/alerts')),
          _NavLink(label: 'Field Reports', icon: Icons.description, onTap: () => context.go('/reports')),
          _NavLink(label: 'Crack Reports', icon: Icons.broken_image, onTap: () => context.go('/crack-reports')),
          _NavLink(label: 'Blasts', icon: Icons.bolt, onTap: () => context.go('/blasts')),
          _NavLink(label: 'Explorations', icon: Icons.explore, onTap: () => context.go('/explorations')),
          _NavLink(label: 'Predictions', icon: Icons.analytics, onTap: () => context.go('/predictions')),

          if (user?.role.isAdmin == true) ...[
            const SizedBox(height: 4),
            _NavLink(
              label: 'Admin Panel',
              icon: Icons.admin_panel_settings,
              onTap: () => context.go('/admin'),
              highlight: true,
            ),
          ],

          const SizedBox(height: 28),

          // ── Logout ────────────────────────────────────────────────────
          SentinelButton(
            label: 'Sign Out',
            outline: true,
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
            },
          ),
          const SizedBox(height: 20),
          const Center(
            child: Text('MINESAFE AI v1.0.0',
              style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 2,
                color: Color(0xFF353534))),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label.toUpperCase(),
          style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
        Text(value,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 13, color: AppTheme.onSurface)),
      ]),
    );
  }
}

class _NavLink extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool highlight;
  const _NavLink({required this.label, required this.icon, required this.onTap, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        margin: const EdgeInsets.only(bottom: 4),
        color: AppTheme.surfaceContainerLow,
        child: Row(children: [
          Icon(icon, size: 18, color: highlight ? AppTheme.primary : const Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(child: Text(label,
            style: TextStyle(
              fontFamily: 'Inter', fontSize: 13, fontWeight: FontWeight.w400,
              color: highlight ? AppTheme.primary : AppTheme.onSurface))),
          const Icon(Icons.chevron_right, size: 16, color: Color(0xFF64748B)),
        ]),
      ),
    );
  }
}
