import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
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

  Color get _riskColor => switch (report.riskLevel) {
    RiskLevel.high => AppTheme.errorRedHud,
    RiskLevel.medium => AppTheme.amberWarning,
    RiskLevel.low => AppTheme.riskLow,
    RiskLevel.nominal => AppTheme.riskNominal,
    RiskLevel.unknown => _statusColor,
  };

  Color get _statusColor => switch (report.status) {
    ReportStatus.reviewed  => AppTheme.primary,
    ReportStatus.submitted => AppTheme.amberWarning,
    ReportStatus.pending   => const Color(0xFF64748B),
  };

  @override
  Widget build(BuildContext context) {
    final previewUrl = report.attachments.isNotEmpty ? report.attachments.first : null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceContainer,
          border: Border(
            left: BorderSide(width: 4, color: _riskColor),
          ),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (previewUrl != null) ...[
            _ReportAttachmentThumb(
              imageUrl: previewUrl,
              width: 76,
              height: 76,
              onTap: () => _showAttachmentPreview(context, previewUrl),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(report.status.name.toUpperCase(),
                  style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5,
                    fontWeight: FontWeight.w700, color: _statusColor)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  color: _riskColor.withValues(alpha: 0.15),
                  child: Text(
                    (report.severity ?? report.riskLevel.label).toUpperCase(),
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 8,
                      letterSpacing: 1,
                      fontWeight: FontWeight.w700,
                      color: _riskColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(report.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 14,
                fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
            const SizedBox(height: 4),
            Text(report.zoneName ?? report.zoneId ?? '—',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: AppTheme.onSurfaceVariant)),
            if (report.attachments.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('${report.attachments.length} ATTACHMENT${report.attachments.length == 1 ? '' : 'S'}',
                style: const TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 8,
                  letterSpacing: 1,
                  color: AppTheme.onSurfaceVariant,
                )),
            ],
          ])),
          const SizedBox(width: 8),
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

  String? _firstNonEmpty(List<dynamic> values) {
    for (final value in values) {
      final text = value?.toString().trim();
      if (text != null && text.isNotEmpty) return text;
    }
    return null;
  }

  Future<void> _generateAiDraft() async {
    setState(() => _isAiLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final payload = <String, dynamic>{
        'zone_id': _selectedZoneId,
        'report_type': 'field_observation',
        'description': _descCtrl.text.trim(),
        'observations': _descCtrl.text.trim(),
      };
      payload.removeWhere((_, value) => value == null || (value is String && value.trim().isEmpty));

      final data = await api.post('/api/reports/generate-ai-draft', data: payload) as Map<String, dynamic>;
      final rawDraft = data['draft'];
      final draft = rawDraft is Map<String, dynamic> ? rawDraft : data;

      final title = _firstNonEmpty([
        draft['title'],
      ]);
      final description = _firstNonEmpty([
        draft['description'],
        draft['observations'],
        draft['remarks'],
      ]);

      if (title == null && description == null) {
        throw Exception('AI returned an empty draft');
      }

      setState(() {
        if (title != null) _titleCtrl.text = title;
        if (description != null) _descCtrl.text = description;
      });

      if (mounted) {
        final source = draft['source']?.toString() ?? 'ai';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI draft generated ($source).')),
        );
      }
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
    if (_selectedZoneId == null || _selectedZoneId!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a zone before submitting.')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final currentUser = ref.read(currentUserProvider);
      final title = _titleCtrl.text.trim();
      final description = _descCtrl.text.trim();

      final remarks = [
        if (title.isNotEmpty) 'Title: $title',
        if (description.isNotEmpty) description,
      ].join('\n');

      final formData = FormData.fromMap({
        'zone_id': _selectedZoneId,
        'severity': 'medium',
        'remarks': remarks,
        'reported_by': currentUser?.name ?? currentUser?.email ?? 'Mobile User',
      });

      await api.postFormData('/api/reports', formData);
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
    final reportAsync = ref.watch(reportDetailProvider(reportId));

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

  Color get _riskColor => switch (report.riskLevel) {
    RiskLevel.high => AppTheme.errorRedHud,
    RiskLevel.medium => AppTheme.amberWarning,
    RiskLevel.low => AppTheme.riskLow,
    RiskLevel.nominal => AppTheme.riskNominal,
    RiskLevel.unknown => AppTheme.secondary,
  };

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(report.title,
          style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 22,
            fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          RiskBadge(level: report.riskLevel),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            color: _riskColor.withValues(alpha: 0.15),
            child: Text(
              report.status.name.toUpperCase(),
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 9,
                letterSpacing: 1.2,
                color: _riskColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ]),
        if (report.attachments.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('ATTACHMENTS (${report.attachments.length})',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              letterSpacing: 1.5,
              color: AppTheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            )),
          const SizedBox(height: 10),
          SizedBox(
            height: 180,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: report.attachments.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => _ReportAttachmentThumb(
                imageUrl: report.attachments[i],
                width: 160,
                height: 180,
                onTap: () => _showAttachmentPreview(context, report.attachments[i]),
              ),
            ),
          ),
        ],
        const SizedBox(height: 20),
        Container(height: 1, color: _riskColor.withValues(alpha: 0.3)),
        const SizedBox(height: 20),
        Text(report.description.trim().isEmpty ? 'No description available.' : report.description,
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

class _ReportAttachmentThumb extends StatelessWidget {
  final String imageUrl;
  final double width;
  final double height;
  final VoidCallback? onTap;

  const _ReportAttachmentThumb({
    required this.imageUrl,
    required this.width,
    required this.height,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: width,
        height: height,
        color: AppTheme.surfaceContainerHighest,
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => const Center(
            child: Icon(Icons.broken_image_outlined, color: AppTheme.onSurfaceVariant),
          ),
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return const Center(
              child: SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
              ),
            );
          },
        ),
      ),
    );
  }
}

void _showAttachmentPreview(BuildContext context, String imageUrl) {
  showDialog(
    context: context,
    barrierColor: Colors.black.withValues(alpha: 0.9),
    builder: (_) => Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(12),
      child: Stack(
        children: [
          InteractiveViewer(
            child: Image.network(
              imageUrl,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const SizedBox(
                height: 260,
                child: Center(
                  child: Icon(Icons.broken_image_outlined, color: AppTheme.onSurfaceVariant, size: 34),
                ),
              ),
            ),
          ),
          Positioned(
            right: 0,
            top: 0,
            child: IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close, color: Colors.white),
            ),
          ),
        ],
      ),
    ),
  );
}
