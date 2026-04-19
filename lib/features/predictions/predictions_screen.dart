import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/models/app_models.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class PredictionsScreen extends ConsumerStatefulWidget {
  const PredictionsScreen({super.key});

  @override
  ConsumerState<PredictionsScreen> createState() => _PredictionsScreenState();
}

class _PredictionsScreenState extends ConsumerState<PredictionsScreen> {
  void _openZoneDetail(BuildContext context, String zoneId) {
    final id = zoneId.trim();
    if (id.isEmpty) return;
    context.push('/predictions/${Uri.encodeComponent(id)}');
  }

  Future<void> _refresh() async {
    ref.invalidate(predictionSummaryProvider);
    ref.invalidate(zonePredictionsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final summaryAsync = ref.watch(predictionSummaryProvider);
    final predictionsAsync = ref.watch(zonePredictionsProvider);
    final notif = ref.watch(notificationProvider);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Column(
        children: [
          TelemetryStrip(
            items: const [
              TelemetryItem(label: 'MODULE', value: 'AI PREDICTIONS'),
              TelemetryItem(label: 'ENGINE', value: 'SENTINEL ML', highlighted: true),
              TelemetryItem(label: 'MODE', value: 'MOBILE INTEL VIEW'),
            ],
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surfaceContainerHigh,
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  summaryAsync.when(
                    data: (summary) => _SummaryPanel(summary: summary),
                    loading: () => const SizedBox(
                      height: 160,
                      child: LoadingState(message: 'LOADING SUMMARY'),
                    ),
                    error: (e, _) => ErrorState(message: e.toString()),
                  ),
                  const SizedBox(height: 20),
                  const SectionHeader(title: 'Zone Prediction Matrix', live: true),
                  const SizedBox(height: 12),
                  predictionsAsync.when(
                    data: (predictions) {
                      if (predictions.isEmpty) {
                        return const EmptyState(message: 'No prediction rows available');
                      }

                      final sorted = [...predictions]
                        ..sort((a, b) => b.hazardScore.compareTo(a.hazardScore));

                      return Column(
                        children: sorted
                            .map(
                              (prediction) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: _PredictionMatrixCard(
                                  prediction: prediction,
                                  onTap: () => _openZoneDetail(context, prediction.zoneId),
                                ),
                              ),
                            )
                            .toList(),
                      );
                    },
                    loading: () => const LoadingState(message: 'LOADING ZONES'),
                    error: (e, _) => ErrorState(message: e.toString()),
                  ),
                  const SizedBox(height: 20),
                  const SectionHeader(title: 'Zone Detail View'),
                  const SizedBox(height: 12),
                  const _HintCard(
                    text:
                        'Tap any zone prediction card above to open a full zone detail page with risk breakdown, contributing factors, and rainfall forecast.',
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PredictionZoneDetailScreen extends ConsumerWidget {
  final String zoneId;

  const PredictionZoneDetailScreen({super.key, required this.zoneId});

  Future<void> _refresh(WidgetRef ref) async {
    ref.invalidate(zonePredictionDetailProvider(zoneId));
    ref.invalidate(zonePredictionsProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notif = ref.watch(notificationProvider);
    final detailAsync = ref.watch(zonePredictionDetailProvider(zoneId));

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: Column(
        children: [
          TelemetryStrip(
            items: [
              const TelemetryItem(label: 'MODULE', value: 'ZONE DETAIL'),
              TelemetryItem(
                label: 'ZONE',
                value: zoneId.length > 10 ? '${zoneId.substring(0, 10)}...' : zoneId,
                highlighted: true,
              ),
            ],
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.primary,
              backgroundColor: AppTheme.surfaceContainerHigh,
              onRefresh: () => _refresh(ref),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => context.pop(),
                      icon: const Icon(Icons.arrow_back, size: 16, color: AppTheme.primary),
                      label: const Text(
                        'BACK TO MATRIX',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.2,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  detailAsync.when(
                    data: (detail) {
                      if (detail == null) {
                        return const _HintCard(
                          text: 'No detail available for this zone prediction.',
                        );
                      }

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _ZoneDetailHero(detail: detail),
                          const SizedBox(height: 12),
                          _ZoneDetailCard(detail: detail),
                        ],
                      );
                    },
                    loading: () => const SizedBox(
                      height: 140,
                      child: LoadingState(message: 'LOADING ZONE DETAIL'),
                    ),
                    error: (e, _) => ErrorState(message: e.toString()),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ZoneDetailHero extends StatelessWidget {
  final ZonePrediction detail;

  const _ZoneDetailHero({required this.detail});

  @override
  Widget build(BuildContext context) {
    final riskColor = switch (detail.predictedRisk) {
      RiskLevel.high => AppTheme.errorRedHud,
      RiskLevel.medium => AppTheme.amberWarning,
      RiskLevel.low => AppTheme.riskLow,
      RiskLevel.nominal => AppTheme.riskNominal,
      RiskLevel.unknown => AppTheme.secondary,
    };

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            detail.zoneName,
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: AppTheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${detail.mineName} • ${detail.district}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 12,
              color: AppTheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
            color: riskColor.withValues(alpha: 0.15),
            child: Text(
              'PREDICTED ${detail.predictedRisk.label} ${(detail.predictedRiskScore * 100).toStringAsFixed(0)}%',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                fontWeight: FontWeight.w700,
                color: riskColor,
                letterSpacing: 1.0,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryPanel extends StatelessWidget {
  final PredictionSummary summary;

  const _SummaryPanel({required this.summary});

  @override
  Widget build(BuildContext context) {
    Color distributionColor(String key) {
      final normalized = key.toLowerCase();
      if (normalized == 'critical' || normalized == 'high' || normalized == 'red') {
        return AppTheme.riskHigh;
      }
      if (normalized == 'medium' || normalized == 'orange' || normalized == 'yellow') {
        return AppTheme.amberWarning;
      }
      if (normalized == 'low' || normalized == 'green' || normalized == 'nominal') {
        return AppTheme.riskLow;
      }
      return AppTheme.onSurfaceVariant;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      color: AppTheme.surfaceContainer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'PREDICTION OVERVIEW',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 9,
              letterSpacing: 1.5,
              fontWeight: FontWeight.w700,
              color: Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            '${summary.avgHazardScore.toStringAsFixed(2)}%',
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 44,
              fontWeight: FontWeight.w700,
              letterSpacing: -1.5,
              color: AppTheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'AVERAGE HAZARD SCORE',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              letterSpacing: 1.2,
              color: AppTheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
              mainAxisExtent: 88,
            ),
            itemCount: 4,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemBuilder: (context, index) {
              return switch (index) {
                0 => _MetricTile(label: 'Total Zones', value: summary.totalZones.toString()),
                1 => _MetricTile(
                    label: 'Critical / High',
                    value: summary.criticalOrHigh.toString(),
                    valueColor: AppTheme.primaryContainer,
                  ),
                2 => _MetricTile(label: 'Predicted Today', value: summary.predictedToday.toString()),
                _ => _MetricTile(
                    label: 'Model 1',
                    value: summary.model1Available ? 'ONLINE' : 'OFFLINE',
                    valueColor:
                        summary.model1Available ? AppTheme.riskLow : AppTheme.primaryContainer,
                  ),
              };
            },
          ),
          const SizedBox(height: 10),
          if (summary.riskDistribution.isNotEmpty)
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: summary.riskDistribution.entries
                  .map(
                    (entry) => _DistChip(
                      label: '${entry.key.toUpperCase()} ${entry.value}',
                      color: distributionColor(entry.key),
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }
}

class _PredictionMatrixCard extends StatelessWidget {
  final ZonePrediction prediction;
  final VoidCallback onTap;

  const _PredictionMatrixCard({
    required this.prediction,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final border = Border.all(
      color: AppTheme.outlineVariant.withValues(alpha: 0.25),
      width: 1,
    );

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppTheme.surfaceContainer,
          border: border,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        prediction.zoneName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${prediction.mineName} • ${prediction.district}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 10,
                          color: AppTheme.onSurfaceVariant,
                          letterSpacing: 0.4,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${prediction.hazardScore.toStringAsFixed(2)}%',
                      style: const TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.amberWarning,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Icon(
                      Icons.chevron_right,
                      size: 16,
                      color: AppTheme.onSurfaceVariant,
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _RiskBand(
                    label: 'CURRENT',
                    level: prediction.currentRisk,
                    scoreFraction: prediction.currentRiskScore,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _RiskBand(
                    label: 'PREDICTED',
                    level: prediction.predictedRisk,
                    scoreFraction: prediction.predictedRiskScore,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _InfoToken(
                  label: 'RAIN 7D',
                  value: '${prediction.rainfallTotalMm.toStringAsFixed(1)} mm',
                ),
                _InfoToken(
                  label: 'BLAST',
                  value: prediction.latestBlastAnomaly ? 'ANOMALY' : 'NORMAL',
                  valueColor:
                      prediction.latestBlastAnomaly ? AppTheme.primaryContainer : AppTheme.riskLow,
                ),
                _InfoToken(
                  label: 'MODEL 1',
                  value: prediction.model1Available ? 'ONLINE' : 'OFFLINE',
                  valueColor: prediction.model1Available ? AppTheme.riskLow : AppTheme.primaryContainer,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ZoneDetailCard extends StatelessWidget {
  final ZonePrediction detail;

  const _ZoneDetailCard({required this.detail});

  @override
  Widget build(BuildContext context) {
    final updatedAt = detail.predictedAt != null
        ? DateFormat('MMM d, HH:mm').format(detail.predictedAt!)
        : '--';

    return Container(
      padding: const EdgeInsets.all(16),
      color: AppTheme.surfaceContainer,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            detail.zoneName,
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: AppTheme.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            '${detail.district} • Updated: $updatedAt',
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              color: AppTheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MetricTile(
                  label: 'Predicted Risk',
                  value:
                      '${detail.predictedRisk.label} ${(detail.predictedRiskScore * 100).toStringAsFixed(0)}%',
                  dense: true,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _MetricTile(
                  label: 'Hazard Score',
                  value: '${detail.hazardScore.toStringAsFixed(2)}%',
                  valueColor: AppTheme.amberWarning,
                  dense: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Text(
            'TOP CONTRIBUTING FACTORS',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 9,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
              color: AppTheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          if (detail.factorBreakdown.isEmpty)
            const Text(
              'No factor data available.',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 12,
                color: AppTheme.onSurfaceVariant,
              ),
            )
          else
            Column(
              children: detail.factorBreakdown
                  .map(
                    (factor) => Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      color: AppTheme.surfaceContainerHigh,
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              factor.label,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.onSurface,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'value: ${factor.value} | impact: ${factor.impact.toStringAsFixed(2)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.right,
                              style: const TextStyle(
                                fontFamily: 'Courier',
                                fontSize: 10,
                                color: AppTheme.onSurfaceVariant,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
          const SizedBox(height: 10),
          _RainfallForecastPanel(forecast: detail.forecastRainfall7dMm),
        ],
      ),
    );
  }
}

class _RainfallForecastPanel extends StatelessWidget {
  final List<double> forecast;

  const _RainfallForecastPanel({required this.forecast});

  String _flagFromMm(double mm) {
    if (mm >= 65) return 'red';
    if (mm >= 35) return 'orange';
    if (mm >= 15) return 'yellow';
    return 'green';
  }

  Color _flagColor(String flag) {
    return switch (flag) {
      'red' => AppTheme.riskHigh,
      'orange' => AppTheme.amberWarning,
      'yellow' => const Color(0xFFEAB308),
      _ => AppTheme.riskLow,
    };
  }

  @override
  Widget build(BuildContext context) {
    if (forecast.isEmpty) {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 2),
        padding: const EdgeInsets.all(12),
        color: AppTheme.surfaceContainerHigh,
        child: const Text(
          'Rainfall forecast is currently unavailable.',
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            color: AppTheme.onSurfaceVariant,
          ),
        ),
      );
    }

    final rows = List.generate(
      forecast.length,
      (index) {
        final mm = forecast[index];
        final flag = _flagFromMm(mm);
        return (day: index + 1, mm: mm, flag: flag, color: _flagColor(flag));
      },
      growable: false,
    );

    final total = rows.fold<double>(0, (sum, row) => sum + row.mm);
    final peak = rows.reduce((a, b) => a.mm >= b.mm ? a : b);
    final maxMm = rows.fold<double>(1, (maxValue, row) => row.mm > maxValue ? row.mm : maxValue);

    final redCount = rows.where((row) => row.flag == 'red').length;
    final orangeCount = rows.where((row) => row.flag == 'orange').length;
    final yellowCount = rows.where((row) => row.flag == 'yellow').length;
    final greenCount = rows.where((row) => row.flag == 'green').length;

    return Container(
      margin: const EdgeInsets.only(top: 2),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainerHigh,
        border: Border.all(color: AppTheme.primary.withValues(alpha: 0.25), width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'RAINFALL FORECAST (7D)',
            style: TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 14,
              letterSpacing: 1.2,
              fontWeight: FontWeight.w700,
              color: AppTheme.onSurface,
            ),
          ),
          const SizedBox(height: 3),
          const Text(
            'PROPHET DISTRICT OUTLOOK',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 10,
              letterSpacing: 0.9,
              color: AppTheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                  color: AppTheme.surfaceContainer,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'TOTAL 7-DAY RAIN',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 9,
                          letterSpacing: 0.8,
                          color: AppTheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${total.toStringAsFixed(1)} mm',
                        style: const TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.amberWarning,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                  color: AppTheme.surfaceContainer,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'PEAK DAY',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: 9,
                          letterSpacing: 0.8,
                          color: AppTheme.onSurfaceVariant,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'D${peak.day} ${peak.mm.toStringAsFixed(1)} mm',
                        style: TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: peak.color,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 152,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: rows
                  .map(
                    (row) => Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 3),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              row.mm.toStringAsFixed(1),
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 10,
                                color: AppTheme.onSurfaceVariant,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              height: ((row.mm / maxMm) * 88).clamp(12.0, 88.0),
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: row.color.withValues(alpha: 0.85),
                                border: Border.all(color: row.color.withValues(alpha: 0.6), width: 1),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'D${row.day}',
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 10,
                                color: AppTheme.onSurface,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _DistChip(label: 'GREEN $greenCount', color: AppTheme.riskLow),
              _DistChip(label: 'YELLOW $yellowCount', color: const Color(0xFFEAB308)),
              _DistChip(label: 'ORANGE $orangeCount', color: AppTheme.amberWarning),
              _DistChip(label: 'RED $redCount', color: AppTheme.riskHigh),
            ],
          ),
        ],
      ),
    );
  }
}

class _HintCard extends StatelessWidget {
  final String text;

  const _HintCard({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Text(
        text,
        style: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 12,
          color: AppTheme.onSurfaceVariant,
          height: 1.5,
        ),
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool dense;

  const _MetricTile({
    required this.label,
    required this.value,
    this.valueColor,
    this.dense = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: dense ? 10 : 12, vertical: dense ? 8 : 10),
      color: AppTheme.surfaceContainerHigh,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 8,
              letterSpacing: 1.0,
              color: AppTheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: dense ? 13 : 16,
              fontWeight: FontWeight.w700,
              color: valueColor ?? AppTheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }
}

class _DistChip extends StatelessWidget {
  final String label;
  final Color color;

  const _DistChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        border: Border.all(color: color.withValues(alpha: 0.45), width: 1),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 9,
          letterSpacing: 0.8,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _InfoToken extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _InfoToken({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      color: AppTheme.surfaceContainerHigh,
      child: RichText(
        text: TextSpan(
          children: [
            TextSpan(
              text: '${label.toUpperCase()}: ',
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 9,
                color: AppTheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.7,
              ),
            ),
            TextSpan(
              text: value,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                color: valueColor ?? AppTheme.onSurface,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RiskBand extends StatelessWidget {
  final String label;
  final RiskLevel level;
  final double scoreFraction;

  const _RiskBand({
    required this.label,
    required this.level,
    required this.scoreFraction,
  });

  @override
  Widget build(BuildContext context) {
    final percent = (scoreFraction * 100).clamp(0.0, 100.0);

    return Container(
      padding: const EdgeInsets.all(8),
      color: AppTheme.surfaceContainerHigh,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 8,
                    letterSpacing: 1.0,
                    color: AppTheme.onSurfaceVariant,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 4),
                RiskBadge(level: level),
              ],
            ),
          ),
          Text(
            '${percent.toStringAsFixed(0)}%',
            style: const TextStyle(
              fontFamily: 'SpaceGrotesk',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppTheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}
