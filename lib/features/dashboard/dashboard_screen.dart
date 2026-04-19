import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user     = ref.watch(currentUserProvider);
    final notif    = ref.watch(notificationProvider);
    final zonesAsync  = ref.watch(zonesProvider);
    final alertsAsync = ref.watch(alertsProvider(null));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(
        unreadNotifications: notif.unreadCount,
        onNotificationTap: () => context.go('/notifications'),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surfaceContainerHigh,
        onRefresh: () async {
          ref.invalidate(zonesProvider);
          ref.invalidate(alertsProvider(null));
        },
        child: CustomScrollView(
          slivers: [
            // ── Telemetry Strip ──────────────────────────────────────────
            SliverToBoxAdapter(
              child: TelemetryStrip(items: [
                const TelemetryItem(label: 'SYS_STATUS', value: 'NOMINAL', highlighted: true),
                const TelemetryItem(label: 'LOC', value: '19.0760° N, 72.8777° E'),
                const TelemetryItem(label: 'ENCRYPTION', value: 'AES-256'),
                TelemetryItem(label: 'ROLE', value: user?.role.label.toUpperCase() ?? '—'),
              ]),
            ),

            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(delegate: SliverChildListDelegate([
                // ── KPI Grid ──────────────────────────────────────────────
                zonesAsync.when(
                  data: (zones) {
                    final criticalCount = zones.where((z) => z.riskLevel == RiskLevel.high).length;
                    return alertsAsync.when(
                      data: (alerts) {
                        final activeAlerts = alerts.where((a) => a.status == AlertStatus.active).length;
                        return _KpiGrid(
                          monitoredZones: zones.length,
                          criticalZones: criticalCount,
                          activeAlerts: activeAlerts,
                          reportsToday: 42, // From dashboard summary endpoint if available
                        );
                      },
                      loading: () => const SizedBox(height: 144, child: LoadingState()),
                      error: (e, _) => _KpiGrid(monitoredZones: zones.length, criticalZones: criticalCount, activeAlerts: 0, reportsToday: 0),
                    );
                  },
                  loading: () => const SizedBox(height: 144, child: LoadingState()),
                  error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(zonesProvider)),
                ),

                const SizedBox(height: 20),

                // ── Live Map Section ──────────────────────────────────────
                const SectionHeader(title: 'Live District Risk Map', live: true),
                const SizedBox(height: 12),
                GestureDetector(
                  onTap: () => context.go('/map'),
                  child: const _MapThumbnail(),
                ),

                const SizedBox(height: 20),

                // ── Active Alerts Feed ─────────────────────────────────────
                SectionHeader(
                  title: 'Active Alerts Feed',
                  trailing: GestureDetector(
                    onTap: () => context.go('/alerts'),
                    child: const Text('VIEW ALL',
                      style: TextStyle(
                        fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                        letterSpacing: 1.5, color: Color(0xFF64748B))),
                  ),
                ),
                const SizedBox(height: 12),
                alertsAsync.when(
                  data: (alerts) {
                    final active = alerts.where((a) => a.status == AlertStatus.active).take(3).toList();
                    if (active.isEmpty) return const EmptyState(message: 'No active alerts', icon: Icons.check_circle_outline);
                    return Column(
                      children: active.map((a) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: AlertCard(
                          alert: a,
                          currentRole: ref.read(currentRoleProvider),
                          onAcknowledge: () => _acknowledgeAlert(ref, a.id),
                          onResolve: () => _resolveAlert(ref, a.id),
                        ),
                      )).toList(),
                    );
                  },
                  loading: () => const LoadingState(),
                  error: (e, _) => ErrorState(message: e.toString()),
                ),

                const SizedBox(height: 20),

                // ── Quick Actions ─────────────────────────────────────────
                const SectionHeader(title: 'Quick Operations'),
                const SizedBox(height: 12),
                _QuickActions(role: ref.watch(currentRoleProvider)),
                const SizedBox(height: 24),
              ])),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _acknowledgeAlert(WidgetRef ref, String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/acknowledge');
      ref.invalidate(alertsProvider(null));
    } catch (_) {}
  }

  Future<void> _resolveAlert(WidgetRef ref, String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/resolve');
      ref.invalidate(alertsProvider(null));
    } catch (_) {}
  }
}

// ── KPI Grid Widget ────────────────────────────────────────────────────────
class _KpiGrid extends StatelessWidget {
  final int monitoredZones;
  final int criticalZones;
  final int activeAlerts;
  final int reportsToday;

  const _KpiGrid({
    required this.monitoredZones,
    required this.criticalZones,
    required this.activeAlerts,
    required this.reportsToday,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 8,
      mainAxisSpacing: 8,
      shrinkWrap: true,
      childAspectRatio: 1.4,
      physics: const NeverScrollableScrollPhysics(),
      children: [
        KpiCard(
          label: 'Monitored Zones',
          value: monitoredZones.toString().padLeft(3, '0'),
          subLabel: '+4.2%',
          ghostIcon: Icons.grid_view,
        ),
        KpiCard(
          label: 'Critical Zones',
          value: criticalZones.toString().padLeft(2, '0'),
          subLabel: 'STABLE',
          ghostIcon: Icons.dangerous,
          valueColor: AppTheme.primary,
          highlighted: true,
        ),
        KpiCard(
          label: 'Active Alerts',
          value: activeAlerts.toString().padLeft(2, '0'),
          subLabel: '${activeAlerts > 0 ? activeAlerts : "0"} UNREAD',
          ghostIcon: Icons.notifications_active,
          valueColor: activeAlerts > 0 ? AppTheme.primary : null,
          highlighted: activeAlerts > 0,
        ),
        KpiCard(
          label: 'Reports Today',
          value: reportsToday.toString().padLeft(2, '0'),
          subLabel: 'ALL FILED',
          ghostIcon: Icons.article,
        ),
      ],
    );
  }
}

// ── Map Thumbnail ──────────────────────────────────────────────────────────
class _MapThumbnail extends StatelessWidget {
  const _MapThumbnail();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      color: AppTheme.surfaceContainerLow,
      child: Stack(
        children: [
          // Dark tactical background
          Container(color: const Color(0xFF0A1628)),
          // Grid lines overlay (tactical feel)
          CustomPaint(painter: _GridPainter(), size: const Size(double.infinity, 180)),
          // Zone indicators
          Positioned(left: 80, top: 50,
            child: _ZoneDot(color: AppTheme.primaryContainer, pulse: true)),
          Positioned(left: 160, top: 100,
            child: _ZoneDot(color: AppTheme.primary)),
          Positioned(left: 230, top: 70,
            child: _ZoneDot(color: AppTheme.riskLow)),
          // HUD Legend
          Positioned(bottom: 8, left: 8,
            child: TacticalGlassPanel(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Container(width: 7, height: 7, color: AppTheme.primaryContainer),
                  const SizedBox(width: 6),
                  const Text('HIGH ALERT', style: TextStyle(
                    fontFamily: 'Inter', fontSize: 8, letterSpacing: 1, color: AppTheme.onSurface)),
                ]),
                const SizedBox(height: 4),
                Row(children: [
                  Container(width: 7, height: 7, color: AppTheme.riskLow),
                  const SizedBox(width: 6),
                  const Text('MONITORING', style: TextStyle(
                    fontFamily: 'Inter', fontSize: 8, letterSpacing: 1, color: Color(0xFF64748B))),
                ]),
              ]),
            ),
          ),
          // Tap overlay
          Positioned.fill(child: Container(
            alignment: Alignment.center,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: AppTheme.surfaceContainer.withValues(alpha: 0.85),
              child: const Text('TAP TO OPEN FULL MAP',
                style: TextStyle(
                  fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                  letterSpacing: 2, color: AppTheme.primary)),
            ),
          )),
        ],
      ),
    );
  }
}

class _ZoneDot extends StatefulWidget {
  final Color color;
  final bool pulse;
  const _ZoneDot({required this.color, this.pulse = false});

  @override
  State<_ZoneDot> createState() => _ZoneDotState();
}

class _ZoneDotState extends State<_ZoneDot> with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _anim = Tween(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (!widget.pulse) {
      return Container(width: 10, height: 10,
        decoration: BoxDecoration(color: widget.color.withValues(alpha: 0.7), shape: BoxShape.circle));
    }
    return AnimatedBuilder(
      animation: _anim,
      builder: (_, __) => Container(
        width: 14 + 8 * _anim.value, height: 14 + 8 * _anim.value,
        decoration: BoxDecoration(
          color: widget.color.withValues(alpha: 0.3 * (1 - _anim.value)),
          shape: BoxShape.circle),
        child: Center(
          child: Container(width: 10, height: 10,
            decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle)),
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppTheme.outlineVariant.withValues(alpha: 0.15)
      ..strokeWidth = 0.5;
    const step = 30.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(_) => false;
}

// ── Quick Actions ──────────────────────────────────────────────────────────
class _QuickActions extends StatelessWidget {
  final UserRole role;
  const _QuickActions({required this.role});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _ActionChip(label: 'File Report', icon: Icons.description, onTap: () => context.go('/reports/create')),
        _ActionChip(label: 'New Crack', icon: Icons.broken_image, onTap: () => context.go('/crack-reports/create')),
        if (role.canAcknowledge)
          _ActionChip(label: 'Blast Event', icon: Icons.bolt, onTap: () => context.go('/blasts/create')),
        if (role.isAdmin)
          _ActionChip(label: 'Admin Panel', icon: Icons.admin_panel_settings, onTap: () => context.go('/admin')),
      ],
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _ActionChip({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        color: AppTheme.surfaceContainerHigh,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: AppTheme.secondary),
          const SizedBox(width: 6),
          Text(label.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
              letterSpacing: 1.2, color: AppTheme.onSurface)),
        ]),
      ),
    );
  }
}
