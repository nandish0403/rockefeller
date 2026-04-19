import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/auth_provider.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/app_models.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role  = ref.watch(currentRoleProvider);
    final notif = ref.watch(notificationProvider);

    // Role guard
    if (!role.isAdmin) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: const Center(child: ErrorState(message: 'Access restricted to admin users only.')),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppTopBar(unreadNotifications: notif.unreadCount),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TelemetryStrip(items: const [
            TelemetryItem(label: 'MODULE', value: 'ADMIN COMMAND'),
            TelemetryItem(label: 'CLEARANCE', value: 'LEVEL-5', highlighted: true),
          ]),
          const SizedBox(height: 20),

          // ── System Health ─────────────────────────────────────────────
          const SectionHeader(title: 'System Health'),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _HealthCard(
              icon: Icons.memory,
              title: 'SENTINEL',
              subtitle: 'Core Engine',
              tag: 'v4.2.0',
              tagColor: AppTheme.outline,
            )),
            const SizedBox(width: 8),
            Expanded(child: _HealthCard(
              icon: Icons.sync,
              title: 'SYNC',
              subtitle: 'Satellite Link',
              tag: '98.4%',
              tagColor: AppTheme.primary,
              progress: 0.984,
            )),
          ]),

          const SizedBox(height: 20),

          // ── Emergency Broadcast ───────────────────────────────────────
          const SectionHeader(title: 'Emergency Controls'),
          const SizedBox(height: 12),
          _EmergencyBroadcastCard(ref: ref),

          const SizedBox(height: 20),

          // ── Users Management ──────────────────────────────────────────
          const SectionHeader(title: 'Users Management'),
          const SizedBox(height: 12),
          _UsersSection(ref: ref),

          const SizedBox(height: 20),

          // ── Regional Threat Map ───────────────────────────────────────
          const SectionHeader(title: 'Regional Threat Mapping', live: true),
          const SizedBox(height: 12),
          _ThreatMapCard(),
        ],
      ),
    );
  }
}

class _HealthCard extends StatelessWidget {
  final IconData icon;
  final String title, subtitle, tag;
  final Color tagColor;
  final double? progress;

  const _HealthCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.tagColor,
    this.progress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Icon(icon, color: AppTheme.primary, size: 16),
          Text(tag, style: TextStyle(fontFamily: 'Inter', fontSize: 9, letterSpacing: 1,
            fontWeight: FontWeight.w700, color: tagColor)),
        ]),
        const SizedBox(height: 12),
        Text(title, style: const TextStyle(
          fontFamily: 'SpaceGrotesk', fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
        Text(subtitle.toUpperCase(), style: const TextStyle(
          fontFamily: 'Inter', fontSize: 8, letterSpacing: 1.5, color: Color(0xFF64748B))),
        if (progress != null) ...[
          const SizedBox(height: 8),
          Container(
            height: 2, color: AppTheme.surfaceContainerHighest,
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: progress,
              child: Container(color: AppTheme.primary),
            ),
          ),
        ],
      ]),
    );
  }
}

class _EmergencyBroadcastCard extends StatefulWidget {
  final WidgetRef ref;
  const _EmergencyBroadcastCard({required this.ref});

  @override
  State<_EmergencyBroadcastCard> createState() => _EmergencyBroadcastCardState();
}

class _EmergencyBroadcastCardState extends State<_EmergencyBroadcastCard> {
  final _msgCtrl = TextEditingController();
  bool _isLoading = false;

  Future<void> _broadcast() async {
    if (_msgCtrl.text.trim().isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final api = widget.ref.read(apiClientProvider);
      await api.post('/api/emergency/broadcast', data: {'message': _msgCtrl.text});
      _msgCtrl.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Emergency broadcast sent'), behavior: SnackBarBehavior.floating));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainer,
        border: Border.all(color: AppTheme.errorContainer.withValues(alpha: 0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.campaign, color: AppTheme.primaryContainer, size: 16),
          const SizedBox(width: 8),
          const Text('EMERGENCY BROADCAST', style: TextStyle(
            fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
            letterSpacing: 1.5, color: AppTheme.primaryContainer)),
        ]),
        const SizedBox(height: 12),
        SentinelTextField(controller: _msgCtrl, label: 'Broadcast Message', maxLines: 3),
        const SizedBox(height: 12),
        SentinelButton(label: 'Broadcast to All Users', onTap: _broadcast, isLoading: _isLoading),
      ]),
    );
  }
}

class _UsersSection extends StatelessWidget {
  final WidgetRef ref;
  const _UsersSection({required this.ref});

  @override
  Widget build(BuildContext context) {
    // In production this fetches from /api/admin/users
    final users = [
      {'name': 'K. VAUGHAN', 'role': 'Admin', 'district': 'District 07', 'icon': Icons.person},
      {'name': 'M. CHEN', 'role': 'Safety Officer', 'district': 'District 03', 'icon': Icons.shield},
      {'name': 'J. RODRIGUEZ', 'role': 'Field Worker', 'district': 'District 12', 'icon': Icons.engineering},
    ];

    return Column(children: users.map((u) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      margin: const EdgeInsets.only(bottom: 4),
      color: AppTheme.surfaceContainerLow,
      child: Row(children: [
        Container(width: 40, height: 40, color: AppTheme.surfaceContainerHighest,
          child: Icon(u['icon'] as IconData, color: const Color(0xFF64748B), size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(u['name'] as String, style: const TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
          Text((u['district'] as String).toUpperCase(), style: const TextStyle(
            fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5, color: Color(0xFF64748B))),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          color: _roleColor(u['role'] as String),
          child: Text((u['role'] as String).toUpperCase(),
            style: const TextStyle(fontFamily: 'Inter', fontSize: 8, fontWeight: FontWeight.w700,
              letterSpacing: 0.8, color: AppTheme.onPrimaryFixed)),
        ),
      ]),
    )).toList());
  }

  Color _roleColor(String role) => switch (role) {
    'Admin'          => AppTheme.primaryContainer,
    'Safety Officer' => AppTheme.secondaryContainer,
    _                => AppTheme.tertiaryContainer,
  };
}

class _ThreatMapCard extends StatelessWidget {
  const _ThreatMapCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 180,
      color: const Color(0xFF0A1628),
      child: Stack(
        children: [
          CustomPaint(painter: _ScanPainter(), size: const Size(double.infinity, 180)),
          // HUD corner brackets
          Positioned(top: 12, left: 12,
            child: Container(width: 20, height: 20,
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTheme.primary, width: 1.5),
                              left: BorderSide(color: AppTheme.primary, width: 1.5))))),
          Positioned(top: 12, right: 12,
            child: Container(width: 20, height: 20,
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppTheme.primary, width: 1.5),
                              right: BorderSide(color: AppTheme.primary, width: 1.5))))),
          Positioned(bottom: 12, left: 12,
            child: Container(width: 20, height: 20,
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.primary, width: 1.5),
                              left: BorderSide(color: AppTheme.primary, width: 1.5))))),
          // Info overlays
          Positioned(top: 12, left: 40,
            child: TacticalGlassPanel(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
                Text('SCAN ACTIVE', style: TextStyle(fontFamily: 'Inter', fontSize: 7,
                  letterSpacing: 1, color: AppTheme.primary, fontWeight: FontWeight.w700)),
                Text('LOC_SEC_ALPHA', style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 9,
                  fontWeight: FontWeight.w700, color: AppTheme.onSurface)),
              ]),
            ),
          ),
          Positioned(bottom: 12, right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              color: AppTheme.errorContainer.withValues(alpha: 0.85),
              child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: const [
                Text('THREAT LEVEL', style: TextStyle(fontFamily: 'Inter', fontSize: 7,
                  letterSpacing: 1, color: AppTheme.onErrorContainer)),
                Text('ELEVATED (B2)', style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 9,
                  fontWeight: FontWeight.w700, color: AppTheme.onErrorContainer)),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScanPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = AppTheme.outlineVariant.withValues(alpha: 0.2)
      ..strokeWidth = 0.5;
    const step = 20.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    // Threat dots
    final dotPaint = Paint()..color = AppTheme.primaryContainer.withValues(alpha: 0.8);
    canvas.drawCircle(const Offset(120, 80), 4, dotPaint);
    canvas.drawCircle(const Offset(220, 130), 3, dotPaint);
    final dimDot = Paint()..color = AppTheme.riskLow.withValues(alpha: 0.6);
    canvas.drawCircle(const Offset(280, 60), 3, dimDot);
  }

  @override
  bool shouldRepaint(_) => false;
}
