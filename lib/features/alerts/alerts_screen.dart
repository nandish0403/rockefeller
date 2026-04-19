import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/app_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class AlertsScreen extends ConsumerStatefulWidget {
  const AlertsScreen({super.key});

  @override
  ConsumerState<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends ConsumerState<AlertsScreen> {
  AlertStatus _filter = AlertStatus.active;

  @override
  Widget build(BuildContext context) {
    final filterStr = _filter == AlertStatus.active ? 'active' :
                      _filter == AlertStatus.acknowledged ? 'acknowledged' : 'resolved';
    final alertsAsync = ref.watch(alertsProvider(filterStr));
    final notif = ref.watch(notificationProvider);
    final role  = ref.watch(currentRoleProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Column(
        children: [
          TelemetryStrip(items: [
            TelemetryItem(label: 'SECTOR', value: '7-DELTA'),
            TelemetryItem(label: 'STATUS',
              value: alertsAsync.value?.isEmpty == true ? 'ALL CLEAR' : 'HIGH ALERT',
              highlighted: alertsAsync.value?.isNotEmpty == true),
          ]),
          // ── Filter Tabs ──────────────────────────────────────────────
          Container(
            color: AppTheme.surfaceContainerLowest,
            padding: const EdgeInsets.all(12),
            child: Row(children: [
              _FilterTab(
                label: 'Active',
                count: alertsAsync.value?.length,
                selected: _filter == AlertStatus.active,
                onTap: () => setState(() => _filter = AlertStatus.active),
              ),
              const SizedBox(width: 8),
              _FilterTab(
                label: 'Acknowledged',
                selected: _filter == AlertStatus.acknowledged,
                onTap: () {
                  setState(() => _filter = AlertStatus.acknowledged);
                  ref.invalidate(alertsProvider('acknowledged'));
                },
              ),
              const SizedBox(width: 8),
              _FilterTab(
                label: 'Resolved',
                selected: _filter == AlertStatus.resolved,
                onTap: () {
                  setState(() => _filter = AlertStatus.resolved);
                  ref.invalidate(alertsProvider('resolved'));
                },
              ),
            ]),
          ),
          // ── Alerts List ───────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surfaceContainerHigh,
              onRefresh: () async => ref.invalidate(alertsProvider(filterStr)),
              child: alertsAsync.when(
                data: (alerts) {
                  if (alerts.isEmpty) {
                    return const EmptyState(
                      message: 'No alerts in this category', icon: Icons.check_circle_outline);
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(12),
                    itemCount: alerts.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) => AlertCard(
                      alert: alerts[i],
                      currentRole: role,
                      onAcknowledge: () => _acknowledge(alerts[i].id),
                      onResolve: () => _resolve(alerts[i].id),
                    ),
                  );
                },
                loading: () => const LoadingState(message: 'LOADING ALERTS'),
                error: (e, _) => ErrorState(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(alertsProvider(filterStr)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _acknowledge(String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/acknowledge');
      ref.invalidate(alertsProvider('active'));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alert acknowledged'), behavior: SnackBarBehavior.floating));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _resolve(String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/resolve');
      ref.invalidate(alertsProvider('active'));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }
}

class _FilterTab extends StatelessWidget {
  final String label;
  final int? count;
  final bool selected;
  final VoidCallback onTap;

  const _FilterTab({required this.label, required this.selected, required this.onTap, this.count});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        color: selected ? AppTheme.primaryContainer : AppTheme.surfaceContainerHigh,
        child: Text(
          count != null ? '$label ($count)' : label,
          style: TextStyle(
            fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            color: selected ? AppTheme.onPrimaryFixed : const Color(0xFF64748B)),
        ),
      ),
    );
  }
}
