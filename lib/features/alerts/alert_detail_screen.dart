import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/app_models.dart';
import '../../core/providers/app_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class AlertDetailScreen extends ConsumerWidget {
  const AlertDetailScreen({super.key, required this.alertId});

  final String alertId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(currentRoleProvider);
    final notifications = ref.watch(notificationProvider);
    final alertAsync = ref.watch(alertDetailProvider(alertId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notifications.unreadCount),
      body: alertAsync.when(
        data: (alert) {
          if (alert == null) {
            return const Center(
              child: Text(
                'Alert not found',
                style: TextStyle(color: AppTheme.onSurfaceVariant),
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            children: [
              Text(
                alert.title,
                style: const TextStyle(
                  color: AppTheme.onSurface,
                  fontFamily: 'SpaceGrotesk',
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                alert.description,
                style: const TextStyle(
                  color: AppTheme.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontSize: 14,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 18),
              _row('Zone', alert.zoneName ?? '--'),
              _row('Status', alert.status.name.toUpperCase()),
              _row('Severity', alert.severity.name.toUpperCase()),
              _row('District', alert.district ?? '--'),
              _row('Source', alert.sourceSensor ?? '--'),
              _row('Recommended action', alert.recommendedAction ?? '--'),
              const SizedBox(height: 20),
              if (role != UserRole.fieldWorker && alert.status == AlertStatus.active)
                ElevatedButton(
                  onPressed: () => _acknowledge(context, ref, alert.id),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: AppTheme.onPrimaryFixed,
                  ),
                  child: const Text('Acknowledge'),
                ),
              if (role.isAdmin && alert.status != AlertStatus.resolved) ...[
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: () => _resolve(context, ref, alert.id),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.amberWarning,
                    side: BorderSide(color: AppTheme.amberWarning.withValues(alpha: 0.6)),
                  ),
                  child: const Text('Resolve'),
                ),
              ],
            ],
          );
        },
        loading: () => const LoadingState(message: 'LOADING ALERT DETAIL'),
        error: (error, _) => ErrorState(message: error.toString()),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color: AppTheme.onSurfaceVariant,
                fontSize: 12,
                fontFamily: 'Inter',
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: AppTheme.onSurface,
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _acknowledge(BuildContext context, WidgetRef ref, String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/acknowledge');
      ref.invalidate(alertDetailProvider(id));
      ref.invalidate(alertsProvider('active'));
      ref.invalidate(alertsProvider('acknowledged'));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alert acknowledged')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }

  Future<void> _resolve(BuildContext context, WidgetRef ref, String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/resolve');
      ref.invalidate(alertDetailProvider(id));
      ref.invalidate(alertsProvider('active'));
      ref.invalidate(alertsProvider('resolved'));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Alert resolved')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }
}
