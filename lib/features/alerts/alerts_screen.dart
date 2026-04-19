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
  AlertSeverity? _severityFilter;
  final TextEditingController _searchController = TextEditingController();
  String _searchTerm = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final notif = ref.watch(notificationProvider);
    final role = ref.watch(currentRoleProvider);

    final activeAsync = ref.watch(alertsProvider('active'));
    final acknowledgedAsync = ref.watch(alertsProvider('acknowledged'));
    final resolvedAsync = ref.watch(alertsProvider('resolved'));

    final currentAlertsAsync = switch (_filter) {
      AlertStatus.active => activeAsync,
      AlertStatus.acknowledged => acknowledgedAsync,
      AlertStatus.resolved => resolvedAsync,
    };

    final activeCount = activeAsync.valueOrNull?.length ?? 0;
    final acknowledgedCount = acknowledgedAsync.valueOrNull?.length ?? 0;
    final resolvedCount = resolvedAsync.valueOrNull?.length ?? 0;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Column(
        children: [
          TelemetryStrip(items: [
            TelemetryItem(label: 'SECTOR', value: '7-DELTA'),
            TelemetryItem(
              label: 'STATUS',
              value: _filter.name.toUpperCase(),
              highlighted: _filter == AlertStatus.active,
            ),
          ]),

          Container(
            color: AppTheme.surfaceContainerLowest,
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: LayoutBuilder(
              builder: (context, constraints) {
                final narrow = constraints.maxWidth < 840;
                final search = Expanded(
                  child: SizedBox(
                    height: 44,
                    child: TextField(
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchTerm = value),
                      style: const TextStyle(
                        color: AppTheme.onSurface,
                        fontSize: 14,
                        fontFamily: 'Inter',
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search alerts by zone or trigger...',
                        prefixIcon: Icon(Icons.search, color: AppTheme.onSurfaceVariant, size: 18),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),
                  ),
                );

                final filters = Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _SeverityDropdown(
                      value: _severityFilter,
                      onChanged: (value) => setState(() => _severityFilter = value),
                    ),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _severityFilter = null;
                          _searchTerm = '';
                          _searchController.clear();
                        });
                      },
                      child: Container(
                        width: 42,
                        height: 42,
                        color: AppTheme.surfaceContainerHigh,
                        alignment: Alignment.center,
                        child: const Icon(
                          Icons.tune,
                          color: AppTheme.onSurfaceVariant,
                          size: 18,
                        ),
                      ),
                    ),
                  ],
                );

                if (narrow) {
                  return Column(
                    children: [
                      Row(children: [search]),
                      const SizedBox(height: 10),
                      Align(alignment: Alignment.centerRight, child: filters),
                    ],
                  );
                }

                return Row(
                  children: [
                    search,
                    const SizedBox(width: 10),
                    filters,
                  ],
                );
              },
            ),
          ),

          Container(
            color: AppTheme.surfaceContainerLowest,
            padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterTab(
                    label: 'Active',
                    count: activeCount,
                    selected: _filter == AlertStatus.active,
                    onTap: () => setState(() => _filter = AlertStatus.active),
                  ),
                  const SizedBox(width: 18),
                  _FilterTab(
                    label: 'Acknowledged',
                    count: acknowledgedCount,
                    selected: _filter == AlertStatus.acknowledged,
                    onTap: () => setState(() => _filter = AlertStatus.acknowledged),
                  ),
                  const SizedBox(width: 18),
                  _FilterTab(
                    label: 'Resolved',
                    count: resolvedCount,
                    selected: _filter == AlertStatus.resolved,
                    onTap: () => setState(() => _filter = AlertStatus.resolved),
                  ),
                ],
              ),
            ),
          ),

          if (role == UserRole.fieldWorker)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.fromLTRB(14, 8, 14, 8),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              color: const Color(0xFF0E2A23),
              child: const Text(
                'Read-only alerts view. Acknowledge, resolve, and emergency actions are restricted to officers/admin.',
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 12,
                  color: Color(0xFF39CFA0),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),

          const SizedBox(height: 4),

          // ── Alerts List ───────────────────────────────────────────────
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surfaceContainerHigh,
              onRefresh: () async => _invalidateAlertLists(),
              child: currentAlertsAsync.when(
                data: (alerts) {
                  final filtered = _applyClientFilters(alerts);
                  if (filtered.isEmpty) {
                    return const EmptyState(
                      message: 'No alerts match this filter',
                      icon: Icons.check_circle_outline,
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 20),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => AlertCard(
                      alert: filtered[i],
                      currentRole: role,
                      onAcknowledge: () => _acknowledge(filtered[i].id),
                      onResolve: () => _resolve(filtered[i].id),
                    ),
                  );
                },
                loading: () => const LoadingState(message: 'LOADING ALERTS'),
                error: (e, _) => ErrorState(
                  message: e.toString(),
                  onRetry: _invalidateAlertLists,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<AlertModel> _applyClientFilters(List<AlertModel> alerts) {
    final q = _searchTerm.trim().toLowerCase();
    return alerts.where((alert) {
      if (_severityFilter != null && alert.severity != _severityFilter) {
        return false;
      }
      if (q.isEmpty) return true;

      final bag = [
        alert.title,
        alert.description,
        alert.zoneName,
        alert.district,
        alert.sourceSensor,
      ].whereType<String>().join(' ').toLowerCase();

      return bag.contains(q);
    }).toList();
  }

  void _invalidateAlertLists() {
    ref.invalidate(alertsProvider('active'));
    ref.invalidate(alertsProvider('acknowledged'));
    ref.invalidate(alertsProvider('resolved'));
  }

  Future<void> _acknowledge(String id) async {
    final api = ref.read(apiClientProvider);
    try {
      await api.patch('/api/alerts/$id/acknowledge');
      _invalidateAlertLists();
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
      _invalidateAlertLists();
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
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: selected ? AppTheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          '$label (${count ?? 0})',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
            color: selected ? const Color(0xFFF3B5AE) : const Color(0xFF8A8A8A),
          ),
        ),
      ),
    );
  }
}

class _SeverityDropdown extends StatelessWidget {
  final AlertSeverity? value;
  final ValueChanged<AlertSeverity?> onChanged;

  const _SeverityDropdown({required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 42,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      color: AppTheme.surfaceContainerHigh,
      child: DropdownButtonHideUnderline(
        child: DropdownButton<AlertSeverity?>(
          value: value,
          icon: const Icon(Icons.keyboard_arrow_down, color: AppTheme.onSurfaceVariant),
          dropdownColor: AppTheme.surfaceContainerHigh,
          style: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.onSurface,
          ),
          items: const [
            DropdownMenuItem<AlertSeverity?>(
              value: null,
              child: Text('Risk Level'),
            ),
            DropdownMenuItem<AlertSeverity?>(
              value: AlertSeverity.critical,
              child: Text('Emergency'),
            ),
            DropdownMenuItem<AlertSeverity?>(
              value: AlertSeverity.warning,
              child: Text('Warning'),
            ),
            DropdownMenuItem<AlertSeverity?>(
              value: AlertSeverity.info,
              child: Text('Info'),
            ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}
