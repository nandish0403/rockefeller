import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/app_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(reportsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      floatingActionButton: _CreateFab(onTap: () => context.go('/reports/create')),
      body: Column(children: [
        TelemetryStrip(items: const [
          TelemetryItem(label: 'MODULE', value: 'FIELD REPORTS'),
          TelemetryItem(label: 'AI', value: 'ENABLED', highlighted: true),
        ]),
        Expanded(child: RefreshIndicator(
          color: AppTheme.primary,
          backgroundColor: AppTheme.surfaceContainerHigh,
          onRefresh: () async => ref.invalidate(reportsProvider),
          child: reportsAsync.when(
            data: (reports) {
              if (reports.isEmpty) return const EmptyState(message: 'No reports filed', icon: Icons.description);
              return ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: reports.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _ReportCard(
                  report: reports[i],
                  onTap: () => context.go('/reports/${reports[i].id}'),
                ),
              );
            },
            loading: () => const LoadingState(message: 'LOADING REPORTS'),
            error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(reportsProvider)),
          ),
        )),
      ]),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final ReportModel report;
  final VoidCallback onTap;
  const _ReportCard({required this.report, required this.onTap});

  Color get _statusColor => switch (report.status) {
    ReportStatus.reviewed  => AppTheme.primary,
    ReportStatus.submitted => AppTheme.amberWarning,
    ReportStatus.pending   => const Color(0xFF64748B),
  };

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        color: AppTheme.surfaceContainer,
        child: Row(children: [
          Container(width: 3, height: 60, color: _statusColor),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(report.status.name.toUpperCase(),
              style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5,
                fontWeight: FontWeight.w700, color: _statusColor)),
            const SizedBox(height: 4),
            Text(report.title,
              style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 14,
                fontWeight: FontWeight.w600, color: AppTheme.onSurface)),
            const SizedBox(height: 4),
            Text(report.zoneName ?? report.zoneId ?? '—',
              style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: AppTheme.onSurfaceVariant)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            if (report.createdAt != null)
              Text(DateFormat('MMM d').format(report.createdAt!),
                style: const TextStyle(fontFamily: 'Courier', fontSize: 10, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            const Icon(Icons.chevron_right, size: 16, color: Color(0xFF64748B)),
          ]),
        ]),
      ),
    );
  }
}

class CreateReportScreen extends ConsumerStatefulWidget {
  const CreateReportScreen({super.key});

  @override
  ConsumerState<CreateReportScreen> createState() => _CreateReportScreenState();
}

class _CreateReportScreenState extends ConsumerState<CreateReportScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();
  final _formKey   = GlobalKey<FormState>();
  String? _selectedZoneId;
  bool _isLoading  = false;
  bool _isAiLoading = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _generateAiDraft() async {
    setState(() => _isAiLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final data = await api.post('/api/reports/generate-ai-draft', data: {
        'zone_id': _selectedZoneId,
        'context': _descCtrl.text,
      }) as Map<String, dynamic>;
      setState(() {
        if (data['title'] != null) _titleCtrl.text = data['title'].toString();
        if (data['description'] != null) _descCtrl.text = data['description'].toString();
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('AI draft failed: $e')));
      }
    } finally {
      if (mounted) setState(() => _isAiLoading = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/reports', data: {
        'title': _titleCtrl.text,
        'description': _descCtrl.text,
        'zone_id': _selectedZoneId,
      });
      ref.invalidate(reportsProvider);
      if (mounted) context.go('/reports');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final zonesAsync = ref.watch(zonesProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceContainerLowest,
        leading: GestureDetector(
          onTap: () => context.go('/reports'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('CREATE REPORT',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 12,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // AI Draft Button
            GestureDetector(
              onTap: _isAiLoading ? null : _generateAiDraft,
              child: Container(
                padding: const EdgeInsets.all(14),
                color: AppTheme.surfaceContainerHigh,
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  if (_isAiLoading)
                    const SizedBox(width: 14, height: 14,
                      child: CircularProgressIndicator(color: AppTheme.primary, strokeWidth: 1.5))
                  else
                    const Icon(Icons.auto_awesome, size: 16, color: AppTheme.primary),
                  const SizedBox(width: 10),
                  const Text('GENERATE AI DRAFT',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700,
                      letterSpacing: 1.5, color: AppTheme.primary)),
                ]),
              ),
            ),
            const SizedBox(height: 28),
            SentinelTextField(
              controller: _titleCtrl,
              label: 'Report Title',
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 20),
            // Zone Dropdown
            zonesAsync.when(
              data: (zones) => DropdownButtonFormField<String>(
                initialValue: _selectedZoneId,
                dropdownColor: AppTheme.surfaceContainerHigh,
                style: const TextStyle(color: AppTheme.onSurface, fontFamily: 'Inter', fontSize: 14),
                decoration: const InputDecoration(
                  labelText: 'ZONE',
                  labelStyle: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B)),
                  border: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                  focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary)),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                ),
                items: zones.map((z) => DropdownMenuItem(
                  value: z.id,
                  child: Text(z.name),
                )).toList(),
                onChanged: (v) => setState(() => _selectedZoneId = v),
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 20),
            SentinelTextField(
              controller: _descCtrl,
              label: 'Description / Findings',
              maxLines: 6,
              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 32),
            SentinelButton(label: 'Submit Report', onTap: _submit, isLoading: _isLoading),
          ],
        ),
      ),
    );
  }
}

class ReportDetailScreen extends ConsumerWidget {
  final String reportId;
  const ReportDetailScreen({super.key, required this.reportId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Fetch single report detail
    final reportAsync = ref.watch(FutureProvider<ReportModel>((ref) async {
      final api = ref.read(apiClientProvider);
      final data = await api.get('/api/reports/$reportId');
      return ReportModel.fromJson(data as Map<String, dynamic>);
    }));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceContainerLowest,
        leading: GestureDetector(
          onTap: () => context.go('/reports'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('REPORT DETAIL',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 12,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: reportAsync.when(
        data: (report) => _ReportDetail(report: report),
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(message: e.toString()),
      ),
    );
  }
}

class _ReportDetail extends StatelessWidget {
  final ReportModel report;
  const _ReportDetail({required this.report});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(report.title,
          style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 22,
            fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
        const SizedBox(height: 12),
        Row(children: [
          RiskBadge(level: RiskLevel.nominal),
          const SizedBox(width: 8),
          Text(report.status.name.toUpperCase(),
            style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
        ]),
        const SizedBox(height: 20),
        Container(height: 1, color: AppTheme.outlineVariant.withValues(alpha: 0.2)),
        const SizedBox(height: 20),
        Text(report.description,
          style: const TextStyle(fontFamily: 'Inter', fontSize: 14, color: AppTheme.onSurfaceVariant, height: 1.6)),
        if (report.createdAt != null) ...[
          const SizedBox(height: 20),
          Text('Filed: ${DateFormat('MMM d, y HH:mm').format(report.createdAt!)}',
            style: const TextStyle(fontFamily: 'Courier', fontSize: 10, color: Color(0xFF64748B))),
        ],
      ],
    );
  }
}

class _CreateFab extends StatelessWidget {
  final VoidCallback onTap;
  const _CreateFab({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 52, height: 52,
        color: AppTheme.primaryContainer,
        child: const Icon(Icons.add, color: AppTheme.onPrimaryFixed, size: 24),
      ),
    );
  }
}
