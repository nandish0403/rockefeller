import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class PredictionsScreen extends ConsumerWidget {
  const PredictionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync     = ref.watch(predictionSummaryProvider);
    final predictionsAsync = ref.watch(zonePredictionsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Column(children: [
        TelemetryStrip(items: const [
          TelemetryItem(label: 'MODULE', value: 'AI PREDICTIONS'),
          TelemetryItem(label: 'ENGINE', value: 'SENTINEL ML', highlighted: true),
        ]),
        Expanded(child: RefreshIndicator(
          color: AppTheme.primary,
          backgroundColor: AppTheme.surfaceContainerHigh,
          onRefresh: () async {
            ref.invalidate(predictionSummaryProvider);
            ref.invalidate(zonePredictionsProvider);
          },
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // ── Summary Card ──────────────────────────────────────────
              summaryAsync.when(
                data: (summary) => _SummaryCard(summary: summary),
                loading: () => const SizedBox(height: 120, child: LoadingState()),
                error: (e, _) => ErrorState(message: e.toString()),
              ),
              const SizedBox(height: 20),
              const SectionHeader(title: 'Zone Predictions', live: true),
              const SizedBox(height: 12),
              // ── Zone Prediction List ──────────────────────────────────
              predictionsAsync.when(
                data: (predictions) {
                  if (predictions.isEmpty) return const EmptyState(message: 'No predictions available');
                  return Column(
                    children: predictions.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _PredictionCard(prediction: p),
                    )).toList(),
                  );
                },
                loading: () => const LoadingState(),
                error: (e, _) => ErrorState(message: e.toString()),
              ),
            ],
          ),
        )),
      ]),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final PredictionSummary summary;
  const _SummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      color: AppTheme.surfaceContainer,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('OVERALL RISK FORECAST',
          style: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5,
            fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
        const SizedBox(height: 12),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${(summary.overallRisk * 100).toStringAsFixed(1)}%',
            style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 48,
              fontWeight: FontWeight.w700, letterSpacing: -2, color: AppTheme.onSurface)),
          const SizedBox(width: 16),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('PERIOD: ${summary.forecastPeriod.toUpperCase()}',
              style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1, color: Color(0xFF64748B))),
            const SizedBox(height: 4),
            Text('CONF: ${summary.confidence.toUpperCase()}',
              style: const TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1, color: AppTheme.primary)),
          ]),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.warning, size: 12, color: AppTheme.primaryContainer),
          const SizedBox(width: 6),
          Text('${summary.highRiskZones} HIGH-RISK ZONES DETECTED',
            style: const TextStyle(fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700,
              letterSpacing: 1, color: AppTheme.primaryContainer)),
        ]),
      ]),
    );
  }
}

class _PredictionCard extends StatelessWidget {
  final ZonePrediction prediction;
  const _PredictionCard({required this.prediction});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Row(children: [
        RiskBadge(level: prediction.predictedRisk),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(prediction.zoneName,
            style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 13,
              fontWeight: FontWeight.w600, color: AppTheme.onSurface)),
          if (prediction.recommendation != null)
            Text(prediction.recommendation!,
              maxLines: 2, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontFamily: 'Inter', fontSize: 11,
                color: AppTheme.onSurfaceVariant, height: 1.4)),
        ])),
        Text('${(prediction.probability * 100).toStringAsFixed(0)}%',
          style: const TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 18,
            fontWeight: FontWeight.w700, color: AppTheme.primary)),
      ]),
    );
  }
}
