import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class BlastsScreen extends ConsumerWidget {
  const BlastsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(blastsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      floatingActionButton: GestureDetector(
        onTap: () => context.go('/blasts/create'),
        child: Container(width: 52, height: 52,
          color: AppTheme.primaryContainer,
          child: const Icon(Icons.bolt, color: AppTheme.onPrimaryFixed)),
      ),
      body: Column(children: [
        TelemetryStrip(items: const [
          TelemetryItem(label: 'MODULE', value: 'BLAST TELEMETRY'),
          TelemetryItem(label: 'ANOMALY', value: 'MONITORING', highlighted: true),
        ]),
        Expanded(child: RefreshIndicator(
          color: AppTheme.primary,
          backgroundColor: AppTheme.surfaceContainerHigh,
          onRefresh: () async => ref.invalidate(blastsProvider),
          child: async.when(
            data: (blasts) {
              if (blasts.isEmpty) return const EmptyState(message: 'No blast records', icon: Icons.bolt);
              return ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: blasts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _BlastCard(blast: blasts[i]),
              );
            },
            loading: () => const LoadingState(message: 'LOADING BLASTS'),
            error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(blastsProvider)),
          ),
        )),
      ]),
    );
  }
}

class _BlastCard extends StatelessWidget {
  final BlastModel blast;
  const _BlastCard({required this.blast});

  Color get _anomalyColor => switch (blast.anomalyStatus?.toLowerCase()) {
    'warning'  => AppTheme.amberWarning,
    'critical' => AppTheme.primaryContainer,
    'normal'   => const Color(0xFF64748B),
    _          => const Color(0xFF64748B),
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Row(children: [
        Container(
          width: 40, height: 40,
          color: AppTheme.surfaceContainerHighest,
          child: const Icon(Icons.bolt, color: AppTheme.primary, size: 20)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(blast.blastType.toUpperCase(),
            style: const TextStyle(fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5,
              fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
          const SizedBox(height: 4),
          Text(blast.zoneName ?? blast.zoneId,
            style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 14,
              fontWeight: FontWeight.w600, color: AppTheme.onSurface)),
          if (blast.createdAt != null)
            Text(DateFormat('MMM d, y').format(blast.createdAt!),
              style: const TextStyle(fontFamily: 'Courier', fontSize: 10, color: Color(0xFF64748B))),
        ])),
        if (blast.anomalyStatus != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            color: _anomalyColor.withValues(alpha: 0.15),
            child: Text(blast.anomalyStatus!.toUpperCase(),
              style: TextStyle(fontFamily: 'Inter', fontSize: 8, fontWeight: FontWeight.w700,
                letterSpacing: 1, color: _anomalyColor)),
          ),
      ]),
    );
  }
}

class CreateBlastScreen extends ConsumerStatefulWidget {
  const CreateBlastScreen({super.key});

  @override
  ConsumerState<CreateBlastScreen> createState() => _CreateBlastScreenState();
}

class _CreateBlastScreenState extends ConsumerState<CreateBlastScreen> {
  final _notesCtrl = TextEditingController();
  final _formKey   = GlobalKey<FormState>();
  String? _zoneId;
  String _blastType = 'surface';
  bool _isLoading   = false;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/blasts', data: {
        'zone_id': _zoneId,
        'blast_type': _blastType,
        'notes': _notesCtrl.text,
      });
      ref.invalidate(blastsProvider);
      if (mounted) context.go('/blasts');
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
        leading: GestureDetector(onTap: () => context.go('/blasts'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('CREATE BLAST EVENT',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 11,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Container(padding: const EdgeInsets.all(12), color: AppTheme.errorContainer,
              child: const Row(children: [
                Icon(Icons.warning_rounded, color: AppTheme.onErrorContainer, size: 16),
                SizedBox(width: 8),
                Expanded(child: Text('Submitting a blast may trigger real-time anomaly alerts.',
                  style: TextStyle(fontFamily: 'Inter', fontSize: 12, color: AppTheme.onErrorContainer))),
              ])),
            const SizedBox(height: 24),
            zonesAsync.when(
              data: (zones) => DropdownButtonFormField<String>(
                initialValue: _zoneId,
                dropdownColor: AppTheme.surfaceContainerHigh,
                style: const TextStyle(color: AppTheme.onSurface, fontFamily: 'Inter'),
                decoration: const InputDecoration(
                  labelText: 'ZONE',
                  labelStyle: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B)),
                  border: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                  focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary)),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                ),
                validator: (v) => v == null ? 'Select a zone' : null,
                items: zones.map((z) => DropdownMenuItem(value: z.id, child: Text(z.name))).toList(),
                onChanged: (v) => setState(() => _zoneId = v),
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
            const SizedBox(height: 20),
            const Text('BLAST TYPE', style: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Wrap(spacing: 8, children: [
              for (final t in ['surface', 'underground', 'controlled'])
                GestureDetector(
                  onTap: () => setState(() => _blastType = t),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    color: _blastType == t ? AppTheme.primaryContainer : AppTheme.surfaceContainerHigh,
                    child: Text(t.toUpperCase(),
                      style: TextStyle(fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                        color: _blastType == t ? AppTheme.onPrimaryFixed : const Color(0xFF64748B))),
                  ),
                ),
            ]),
            const SizedBox(height: 20),
            SentinelTextField(controller: _notesCtrl, label: 'Notes', maxLines: 3),
            const SizedBox(height: 32),
            SentinelButton(label: 'Submit Blast Event', onTap: _submit, isLoading: _isLoading),
          ],
        ),
      ),
    );
  }
}
