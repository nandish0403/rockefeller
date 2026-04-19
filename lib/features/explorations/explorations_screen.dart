import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class ExplorationsScreen extends ConsumerWidget {
  const ExplorationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(explorationsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      floatingActionButton: GestureDetector(
        onTap: () => context.go('/explorations/create'),
        child: Container(width: 52, height: 52,
          color: AppTheme.primaryContainer,
          child: const Icon(Icons.explore, color: AppTheme.onPrimaryFixed)),
      ),
      body: Column(children: [
        TelemetryStrip(items: const [TelemetryItem(label: 'MODULE', value: 'EXPLORATION LOGS')]),
        Expanded(child: RefreshIndicator(
          color: AppTheme.primary,
          backgroundColor: AppTheme.surfaceContainerHigh,
          onRefresh: () async => ref.invalidate(explorationsProvider),
          child: async.when(
            data: (explorations) {
              if (explorations.isEmpty) return const EmptyState(message: 'No exploration logs', icon: Icons.explore);
              return ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: explorations.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _ExplorationCard(e: explorations[i]),
              );
            },
            loading: () => const LoadingState(message: 'LOADING'),
            error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(explorationsProvider)),
          ),
        )),
      ]),
    );
  }
}

class _ExplorationCard extends StatelessWidget {
  final ExplorationModel e;
  const _ExplorationCard({required this.e});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Row(children: [
        Container(width: 40, height: 40, color: AppTheme.surfaceContainerHighest,
          child: const Icon(Icons.explore, color: AppTheme.secondary, size: 20)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(e.zoneName ?? e.zoneId, style: const TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.onSurface)),
          const SizedBox(height: 4),
          Text(e.findings, maxLines: 2, overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontFamily: 'Inter', fontSize: 11, color: AppTheme.onSurfaceVariant)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          if (e.depth != null) Text('${e.depth!.toStringAsFixed(1)}m',
            style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 14, fontWeight: FontWeight.w700,
              color: AppTheme.primary)),
          if (e.createdAt != null) Text(DateFormat('MMM d').format(e.createdAt!),
            style: const TextStyle(fontFamily: 'Courier', fontSize: 10, color: Color(0xFF64748B))),
        ]),
      ]),
    );
  }
}

class CreateExplorationScreen extends ConsumerStatefulWidget {
  const CreateExplorationScreen({super.key});

  @override
  ConsumerState<CreateExplorationScreen> createState() => _State();
}

class _State extends ConsumerState<CreateExplorationScreen> {
  final _findingsCtrl = TextEditingController();
  final _depthCtrl    = TextEditingController();
  String? _zoneId;
  bool _isLoading = false;

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.post('/api/explorations', data: {
        'zone_id': _zoneId,
        'findings': _findingsCtrl.text,
        'depth': double.tryParse(_depthCtrl.text),
      });
      ref.invalidate(explorationsProvider);
      if (mounted) context.go('/explorations');
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
        leading: GestureDetector(onTap: () => context.go('/explorations'),
          child: const Icon(Icons.arrow_back, color: AppTheme.onSurface)),
        title: const Text('LOG EXPLORATION',
          style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 11,
            fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.outline)),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          zonesAsync.when(
            data: (zones) => DropdownButtonFormField<String>(
              dropdownColor: AppTheme.surfaceContainerHigh,
              style: const TextStyle(color: AppTheme.onSurface, fontFamily: 'Inter'),
              decoration: const InputDecoration(
                labelText: 'ZONE', labelStyle: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B)),
                border: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
              ),
              items: zones.map((z) => DropdownMenuItem(value: z.id, child: Text(z.name))).toList(),
              onChanged: (v) => setState(() => _zoneId = v),
            ),
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 20),
          SentinelTextField(controller: _depthCtrl, label: 'Depth (meters)',
            keyboardType: TextInputType.number),
          const SizedBox(height: 20),
          SentinelTextField(controller: _findingsCtrl, label: 'Findings / Observations', maxLines: 5),
          const SizedBox(height: 32),
          SentinelButton(label: 'Log Exploration', onTap: _submit, isLoading: _isLoading),
        ],
      ),
    );
  }
}
