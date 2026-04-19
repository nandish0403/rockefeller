import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/providers/app_providers.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class CrackReportsScreen extends ConsumerWidget {
  const CrackReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(crackReportsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      floatingActionButton: GestureDetector(
        onTap: () => context.go('/crack-reports/create'),
        child: Container(width: 52, height: 52,
          color: AppTheme.primaryContainer,
          child: const Icon(Icons.add, color: AppTheme.onPrimaryFixed)),
      ),
      body: Column(children: [
        TelemetryStrip(items: const [
          TelemetryItem(label: 'MODULE', value: 'CRACK ANALYSIS'),
          TelemetryItem(label: 'AI', value: 'ENABLED', highlighted: true),
        ]),
        Expanded(child: RefreshIndicator(
          color: AppTheme.primary,
          backgroundColor: AppTheme.surfaceContainerHigh,
          onRefresh: () async => ref.invalidate(crackReportsProvider),
          child: async.when(
            data: (reports) {
              if (reports.isEmpty) return const EmptyState(message: 'No crack reports', icon: Icons.broken_image);
              return ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: reports.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _CrackCard(
                  report: reports[i],
                  onTap: () => context.go('/crack-reports/${reports[i].id}'),
                ),
              );
            },
            loading: () => const LoadingState(message: 'LOADING CRACK REPORTS'),
            error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(crackReportsProvider)),
          ),
        )),
      ]),
    );
  }
}

class _CrackCard extends StatelessWidget {
  final CrackReportModel report;
  final VoidCallback onTap;
  const _CrackCard({required this.report, required this.onTap});

  Color get _color => switch (report.status) {
    CrackReportStatus.verified => AppTheme.primary,
    CrackReportStatus.reviewed => AppTheme.amberWarning,
    CrackReportStatus.pending  => const Color(0xFF64748B),
  };

  @override
  Widget build(BuildContext context) {
    final previewUrl = report.photos.isNotEmpty ? report.photos.first : null;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        color: AppTheme.surfaceContainer,
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 3, height: 72, color: _color),
          const SizedBox(width: 10),
          if (previewUrl != null) ...[
            _CrackPhotoThumb(
              imageUrl: previewUrl,
              width: 72,
              height: 72,
              onTap: () => _showImagePreview(context, previewUrl),
            ),
            const SizedBox(width: 10),
          ],
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(report.status.name.toUpperCase(),
                style: TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5,
                  fontWeight: FontWeight.w700, color: _color)),
              const SizedBox(height: 4),
              Text(report.location,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 14,
                  fontWeight: FontWeight.w600, color: AppTheme.onSurface)),
              const SizedBox(height: 4),
              Text(report.severity?.toUpperCase() ?? 'UNKNOWN SEVERITY',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontFamily: 'Inter', fontSize: 10, color: AppTheme.onSurfaceVariant)),
              if (report.photos.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text('${report.photos.length} IMAGE${report.photos.length == 1 ? '' : 'S'}',
                  style: const TextStyle(
                    fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.0,
                    color: AppTheme.onSurfaceVariant,
                  )),
              ],
            ]),
          ),
          const SizedBox(width: 8),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(report.submissionMode.toUpperCase(),
              style: const TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1,
                color: AppTheme.primary)),
            const SizedBox(height: 8),
            const Icon(Icons.chevron_right, size: 16, color: Color(0xFF64748B)),
          ]),
        ]),
      ),
    );
  }
}

class CreateCrackReportScreen extends ConsumerStatefulWidget {
  const CreateCrackReportScreen({super.key});

  @override
  ConsumerState<CreateCrackReportScreen> createState() => _State();
}

class _State extends ConsumerState<CreateCrackReportScreen> {
  final _locationCtrl = TextEditingController();
  final _descCtrl     = TextEditingController();
  final _formKey      = GlobalKey<FormState>();
  String _mode        = 'ai';
  String _severity    = 'medium';
  bool _isLoading     = false;

  @override
  void dispose() {
    _locationCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/crack-reports', data: {
        'location': _locationCtrl.text,
        'description': _descCtrl.text,
        'submission_mode': _mode,
        'severity': _severity,
      });
      ref.invalidate(crackReportsProvider);
      if (mounted) context.go('/crack-reports');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceContainerLowest,
        leading: GestureDetector(
          onTap: () => context.go('/crack-reports'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('CRACK REPORT',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 12,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            SentinelTextField(controller: _locationCtrl, label: 'Location / Zone',
              validator: (v) => v == null || v.isEmpty ? 'Required' : null),
            const SizedBox(height: 20),
            SentinelTextField(controller: _descCtrl, label: 'Observations', maxLines: 4,
              validator: (v) => v == null || v.isEmpty ? 'Required' : null),
            const SizedBox(height: 20),
            const Text('ANALYSIS MODE', style: TextStyle(
              fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Row(children: [
              _ModeChip(label: 'AI Analysis', value: 'ai', selected: _mode == 'ai',
                onTap: () => setState(() => _mode = 'ai')),
              const SizedBox(width: 8),
              _ModeChip(label: 'Manual Review', value: 'admin', selected: _mode == 'admin',
                onTap: () => setState(() => _mode = 'admin')),
            ]),
            const SizedBox(height: 20),
            const Text('SEVERITY', style: TextStyle(
              fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Row(children: [
              _ModeChip(label: 'High', value: 'high', selected: _severity == 'high',
                onTap: () => setState(() => _severity = 'high')),
              const SizedBox(width: 8),
              _ModeChip(label: 'Medium', value: 'medium', selected: _severity == 'medium',
                onTap: () => setState(() => _severity = 'medium')),
              const SizedBox(width: 8),
              _ModeChip(label: 'Low', value: 'low', selected: _severity == 'low',
                onTap: () => setState(() => _severity = 'low')),
            ]),
            const SizedBox(height: 32),
            SentinelButton(label: 'Submit Crack Report', onTap: _submit, isLoading: _isLoading),
          ],
        ),
      ),
    );
  }
}

class _ModeChip extends StatelessWidget {
  final String label, value;
  final bool selected;
  final VoidCallback onTap;
  const _ModeChip({required this.label, required this.value, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        color: selected ? AppTheme.primaryContainer : AppTheme.surfaceContainerHigh,
        child: Text(label.toUpperCase(),
          style: TextStyle(
            fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
            letterSpacing: 1, color: selected ? AppTheme.onPrimaryFixed : const Color(0xFF64748B))),
      ),
    );
  }
}

class CrackReportDetailScreen extends ConsumerWidget {
  final String reportId;
  const CrackReportDetailScreen({super.key, required this.reportId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(currentRoleProvider);
    final async = ref.watch(crackReportDetailProvider(reportId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.surfaceContainerLowest,
        leading: GestureDetector(
          onTap: () => context.go('/crack-reports'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('CRACK DETAIL',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 12,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: async.when(
        data: (report) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(report.location, style: const TextStyle(
              fontFamily: 'SpaceGrotesk', fontSize: 22, fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
            const SizedBox(height: 12),
            Row(children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                color: AppTheme.surfaceContainerHighest,
                child: Text(report.status.name.toUpperCase(),
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: AppTheme.primary, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Text(report.submissionMode.toUpperCase(),
                style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
            ]),
            if (report.photos.isNotEmpty) ...[
              const SizedBox(height: 20),
              Text('EVIDENCE (${report.photos.length})',
                style: const TextStyle(
                  fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700,
                  letterSpacing: 1.5, color: AppTheme.onSurfaceVariant,
                )),
              const SizedBox(height: 10),
              SizedBox(
                height: 184,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: report.photos.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) => _CrackPhotoThumb(
                    imageUrl: report.photos[i],
                    width: 164,
                    height: 184,
                    onTap: () => _showImagePreview(context, report.photos[i]),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 20),
            Text(
              report.description.trim().isEmpty
                  ? 'No description available for this crack report.'
                  : report.description,
              style: const TextStyle(fontFamily: 'Inter', fontSize: 14, color: AppTheme.onSurfaceVariant, height: 1.6)),
            if (role.canAcknowledge && report.status == CrackReportStatus.pending) ...[
              const SizedBox(height: 28),
              SentinelButton(
                label: 'Verify Report',
                onTap: () async {
                  final api = ref.read(apiClientProvider);
                  await api.patch('/api/crack-reports/$reportId/verify');
                  if (context.mounted) context.go('/crack-reports');
                },
              ),
            ],
          ],
        ),
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(message: e.toString()),
      ),
    );
  }
}

class _CrackPhotoThumb extends StatelessWidget {
  final String imageUrl;
  final double width;
  final double height;
  final VoidCallback? onTap;

  const _CrackPhotoThumb({
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

void _showImagePreview(BuildContext context, String imageUrl) {
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
