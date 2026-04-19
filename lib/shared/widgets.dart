import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/models/app_models.dart';

// ── App Top Bar ───────────────────────────────────────────────────────────
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  final int unreadNotifications;
  final VoidCallback? onNotificationTap;

  const AppTopBar({
    super.key,
    this.unreadNotifications = 0,
    this.onNotificationTap,
  });

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 56,
      color: AppTheme.surfaceContainerLowest,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(children: [
            const Icon(Icons.security, color: AppTheme.errorRedHud, size: 20),
            const SizedBox(width: 10),
            const Text('ROCKEFELLER SENTINEL',
              style: TextStyle(
                fontFamily: 'SpaceGrotesk',
                fontSize: 14, fontWeight: FontWeight.w700,
                letterSpacing: 2.0, color: AppTheme.errorRedHud)),
          ]),
          GestureDetector(
            onTap: onNotificationTap,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.notifications_outlined, color: Color(0xFF64748B), size: 24),
                if (unreadNotifications > 0)
                  Positioned(
                    right: -2, top: -2,
                    child: Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(
                        color: AppTheme.primary, shape: BoxShape.circle),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Telemetry Strip ───────────────────────────────────────────────────────
class TelemetryStrip extends StatelessWidget {
  final List<TelemetryItem> items;
  const TelemetryStrip({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 28,
      color: AppTheme.surfaceContainerLowest,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 24),
        itemBuilder: (_, i) {
          final item = items[i];
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${item.label}: ',
                style: const TextStyle(
                  fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w300,
                  letterSpacing: 1.5, color: Color(0xFF64748B))),
              Text(item.value,
                style: TextStyle(
                  fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                  letterSpacing: 1.5, color: item.highlighted ? AppTheme.primary : AppTheme.onSurface)),
            ],
          );
        },
      ),
    );
  }
}

class TelemetryItem {
  final String label;
  final String value;
  final bool highlighted;
  const TelemetryItem({required this.label, required this.value, this.highlighted = false});
}

// ── KPI Card ──────────────────────────────────────────────────────────────
class KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final String? subLabel;
  final IconData? ghostIcon;
  final Color? valueColor;
  final bool highlighted;

  const KpiCard({
    super.key,
    required this.label,
    required this.value,
    this.subLabel,
    this.ghostIcon,
    this.valueColor,
    this.highlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      color: AppTheme.surfaceContainer,
      child: Stack(
        children: [
          // Ghost icon
          if (ghostIcon != null)
            Positioned(
              right: -6, bottom: -6,
              child: Icon(ghostIcon, size: 54,
                color: (highlighted ? AppTheme.primary : AppTheme.onSurface).withValues(alpha: 0.08)),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label.toUpperCase(),
                style: const TextStyle(
                  fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w300,
                  letterSpacing: 1.5, color: Color(0xFF64748B))),
              const SizedBox(height: 8),
              Text(value,
                style: TextStyle(
                  fontFamily: 'SpaceGrotesk', fontSize: 28, fontWeight: FontWeight.w700,
                  color: valueColor ?? AppTheme.onSurface, letterSpacing: -0.5)),
              if (subLabel != null)
                Row(children: [
                  Icon(Icons.trending_up, size: 11,
                    color: highlighted ? AppTheme.primary : const Color(0xFF64748B)),
                  const SizedBox(width: 4),
                  Text(subLabel!,
                    style: TextStyle(
                      fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w400,
                      color: highlighted ? AppTheme.primary : const Color(0xFF64748B))),
                ]),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Alert Card ────────────────────────────────────────────────────────────
class AlertCard extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback? onAcknowledge;
  final VoidCallback? onResolve;
  final UserRole currentRole;
  final bool compact;

  const AlertCard({
    super.key,
    required this.alert,
    required this.currentRole,
    this.onAcknowledge,
    this.onResolve,
    this.compact = false,
  });

  Color get _severityColor => switch (alert.severity) {
    AlertSeverity.critical => AppTheme.primaryContainer,
    AlertSeverity.warning  => AppTheme.amberWarning,
    AlertSeverity.info     => const Color(0xFF334155),
  };

  Color get _zoneColor {
    if (alert.zoneRiskLevel != RiskLevel.unknown) {
      return switch (alert.zoneRiskLevel) {
        RiskLevel.high => AppTheme.errorRedHud,
        RiskLevel.medium => AppTheme.amberWarning,
        RiskLevel.low => AppTheme.riskLow,
        RiskLevel.nominal => AppTheme.riskNominal,
        RiskLevel.unknown => _severityColor,
      };
    }
    return _severityColor;
  }

  String get _severityLabel {
    final raw = alert.severityLabel?.trim().toLowerCase();
    if (raw != null && raw.isNotEmpty) {
      if (raw == 'critical' || raw == 'high') return 'EMERGENCY';
      return raw.toUpperCase();
    }
    return switch (alert.severity) {
      AlertSeverity.critical => 'EMERGENCY',
      AlertSeverity.warning  => 'WARNING',
      AlertSeverity.info     => 'INFO',
    };
  }

  String get _displayTitle {
    final title = alert.title.trim();
    final zoneName = alert.zoneName?.trim();
    if ((title.isEmpty || title.toLowerCase() == 'alert') &&
        zoneName != null &&
        zoneName.isNotEmpty) {
      return zoneName;
    }
    return title.isEmpty ? (zoneName ?? 'Alert') : title;
  }

  String get _district =>
      (alert.district ?? alert.location ?? 'Unknown').toUpperCase();
    String get _zoneName => alert.zoneName?.trim().isNotEmpty == true
      ? alert.zoneName!.trim()
      : 'Unknown zone';
  String get _sourceSensor => alert.sourceSensor ?? 'Manual';
  String get _riskProbability => alert.riskProbability ?? '--';
  String get _assignedTo => alert.assignedTo ?? 'Unassigned';
  String get _recommendedAction =>
      (alert.recommendedAction ?? 'Recommended Action').toUpperCase();

  String get _roleStatusLabel {
    if (!currentRole.canAcknowledge && !currentRole.canResolve) return 'READ-ONLY';
    return switch (alert.status) {
      AlertStatus.active => 'ACTIVE',
      AlertStatus.acknowledged => 'ACKNOWLEDGED',
      AlertStatus.resolved => 'RESOLVED',
    };
  }

  @override
  Widget build(BuildContext context) {
    final canAck     = currentRole.canAcknowledge && alert.status == AlertStatus.active;
    final canResolve = currentRole.canResolve && alert.status != AlertStatus.resolved;
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 420 || compact;
        final titleSize = isNarrow ? 20.0 : 24.0;
        final bodySize = isNarrow ? 12.0 : 13.0;

        return Container(
          decoration: BoxDecoration(
            color: AppTheme.surfaceContainer,
            border: Border(left: BorderSide(color: _zoneColor, width: 4)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.18),
                blurRadius: 14,
                offset: const Offset(0, 6),
              )
            ],
          ),
          padding: EdgeInsets.all(isNarrow ? 12 : 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'DISTRICT: $_district',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        letterSpacing: 1.2,
                        color: Color(0xFF8A8A8A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (alert.createdAt != null)
                    Text(
                      _timeAgo(alert.createdAt!),
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        color: Color(0xFF8A8A8A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    margin: const EdgeInsets.only(top: 6),
                    decoration: BoxDecoration(
                      color: _zoneColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _displayTitle,
                      maxLines: isNarrow ? 2 : 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: titleSize,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.4,
                        color: AppTheme.onSurface,
                        height: 1.1,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _TagPill(label: _severityLabel, color: _severityColor),
                ],
              ),
              if (alert.description.trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  alert.description.trim(),
                  maxLines: isNarrow ? 3 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize: bodySize,
                    height: 1.35,
                    color: AppTheme.onSurface,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _MetaChip(label: 'ZONE', value: _zoneName, valueColor: _zoneColor),
                  _MetaChip(label: 'SOURCE', value: _sourceSensor),
                  _MetaChip(label: 'RISK', value: _riskProbability),
                  if (!compact) _MetaChip(label: 'OWNER', value: _assignedTo),
                ],
              ),
              if (_recommendedAction.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.rule_folder_outlined,
                      size: 14,
                      color: AppTheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _recommendedAction,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize: bodySize,
                          letterSpacing: 0.3,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFD8C0B8),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  if (canAck)
                    _ActionButton(
                      label: 'ACKNOWLEDGE',
                      onTap: onAcknowledge,
                      highlighted: false,
                    ),
                  if (canResolve)
                    _ActionButton(
                      label: 'RESOLVE',
                      onTap: onResolve,
                      highlighted: true,
                    ),
                  if (!canAck && !canResolve)
                    Text(
                      _roleStatusLabel,
                      style: const TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.0,
                        color: AppTheme.onSurfaceVariant,
                      ),
                    ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}M AGO';
    if (diff.inHours < 24) return '${diff.inHours}H AGO';
    return '${diff.inDays}D AGO';
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool highlighted;

  const _ActionButton({
    required this.label,
    required this.onTap,
    required this.highlighted,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: highlighted ? AppTheme.primaryContainer : AppTheme.surfaceContainerHighest,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minWidth: 130),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 1.3,
                color: highlighted ? AppTheme.onPrimaryFixed : AppTheme.onSurface,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TagPill extends StatelessWidget {
  final String label;
  final Color color;

  const _TagPill({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        border: Border.all(color: color.withValues(alpha: 0.9)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontFamily: 'Inter',
          fontSize: 10,
          letterSpacing: 1.1,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _MetaChip({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 220),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      color: AppTheme.surfaceContainerHighest,
      child: RichText(
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        text: TextSpan(
          children: [
            TextSpan(
              text: '$label: ',
              style: const TextStyle(
                fontFamily: 'Inter',
                fontSize: 10,
                color: AppTheme.onSurfaceVariant,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
            TextSpan(
              text: value,
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize: 11,
                color: valueColor ?? AppTheme.onSurface,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Risk Badge ────────────────────────────────────────────────────────────
class RiskBadge extends StatelessWidget {
  final RiskLevel level;
  const RiskBadge({super.key, required this.level});

  Color get _bg => switch (level) {
    RiskLevel.high    => AppTheme.errorContainer,
    RiskLevel.medium  => const Color(0xFF92400E),
    RiskLevel.low     => AppTheme.surfaceContainerHighest,
    RiskLevel.nominal => AppTheme.secondaryContainer,
    RiskLevel.unknown => AppTheme.surfaceContainerHighest,
  };

  Color get _fg => switch (level) {
    RiskLevel.high    => AppTheme.onErrorContainer,
    RiskLevel.medium  => const Color(0xFFFEF3C7),
    RiskLevel.low     => AppTheme.onSurface,
    RiskLevel.nominal => AppTheme.onSecondaryContainer,
    RiskLevel.unknown => AppTheme.onSurface,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      color: _bg,
      child: Text(level.label,
        style: TextStyle(
          fontFamily: 'SpaceGrotesk', fontSize: 9, fontWeight: FontWeight.w700,
          letterSpacing: 0.8, color: _fg)),
    );
  }
}

// ── Tactical Glass Panel ───────────────────────────────────────────────────
class TacticalGlassPanel extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;

  const TacticalGlassPanel({super.key, required this.child, this.padding});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.glassBackground,
        border: Border.all(color: AppTheme.outlineVariant.withValues(alpha: 0.2)),
      ),
      padding: padding ?? const EdgeInsets.all(16),
      child: child,
    );
  }
}

// ── Section Header ────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  final bool live;

  const SectionHeader({super.key, required this.title, this.trailing, this.live = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title.toUpperCase(),
          style: const TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 10, fontWeight: FontWeight.w700,
            letterSpacing: 2.5, color: AppTheme.outline)),
        if (live)
          Row(children: [
            Container(
              width: 6, height: 6,
              decoration: const BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            const Text('LIVE', style: TextStyle(
              fontFamily: 'Inter', fontSize: 8, fontWeight: FontWeight.w700,
              letterSpacing: 1, color: AppTheme.primary)),
          ])
        else if (trailing != null)
          trailing!,
      ],
    );
  }
}

// ── Async UI States ───────────────────────────────────────────────────────
class LoadingState extends StatelessWidget {
  final String? message;
  const LoadingState({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(
          width: 24, height: 24,
          child: CircularProgressIndicator(
            color: AppTheme.primary, strokeWidth: 1.5)),
        if (message != null) ...[
          const SizedBox(height: 16),
          Text(message!,
            style: const TextStyle(
              fontFamily: 'Inter', fontSize: 10, letterSpacing: 1.5,
              color: Color(0xFF64748B))),
        ],
      ]),
    );
  }
}

class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  const ErrorState({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.error_outline, color: AppTheme.primaryContainer, size: 36),
          const SizedBox(height: 16),
          Text('ERROR', style: const TextStyle(
            fontFamily: 'SpaceGrotesk', fontSize: 11, letterSpacing: 2,
            color: AppTheme.primaryContainer, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Inter', fontSize: 13, color: AppTheme.onSurfaceVariant, height: 1.5)),
          if (onRetry != null) ...[
            const SizedBox(height: 20),
            GestureDetector(
              onTap: onRetry,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                color: AppTheme.surfaceContainerHighest,
                child: const Text('RETRY',
                  style: TextStyle(
                    fontFamily: 'Inter', fontSize: 10, fontWeight: FontWeight.w700,
                    letterSpacing: 1.5, color: AppTheme.onSurface)),
              ),
            ),
          ],
        ]),
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  final String message;
  final IconData? icon;
  const EmptyState({super.key, required this.message, this.icon});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon ?? Icons.inbox, color: const Color(0xFF64748B), size: 36),
        const SizedBox(height: 12),
        Text(message.toUpperCase(),
          style: const TextStyle(
            fontFamily: 'Inter', fontSize: 9, letterSpacing: 1.5,
            color: Color(0xFF64748B))),
      ]),
    );
  }
}

// ── Role Guard ────────────────────────────────────────────────────────────
class RoleGuard extends StatelessWidget {
  final Widget child;
  final List<UserRole> allowed;
  final Widget? fallback;
  final UserRole currentRole;

  const RoleGuard({
    super.key,
    required this.child,
    required this.allowed,
    required this.currentRole,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    if (allowed.contains(currentRole)) return child;
    return fallback ?? const SizedBox.shrink();
  }
}

// ── Sentinel Text Field ────────────────────────────────────────────────────
class SentinelTextField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int? maxLines;
  final String? Function(String?)? validator;

  const SentinelTextField({
    super.key,
    required this.controller,
    required this.label,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      style: const TextStyle(color: AppTheme.onSurface, fontFamily: 'Inter', fontSize: 14),
      decoration: InputDecoration(
        labelText: label.toUpperCase(),
        labelStyle: const TextStyle(
          fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w300,
          letterSpacing: 1.5, color: Color(0xFF64748B)),
        border: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
        focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.primary)),
        enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: AppTheme.outlineVariant)),
        contentPadding: const EdgeInsets.only(bottom: 8),
      ),
    );
  }
}

// ── Primary Action Button ─────────────────────────────────────────────────
class SentinelButton extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  final bool isLoading;
  final bool outline;

  const SentinelButton({
    super.key,
    required this.label,
    this.onTap,
    this.isLoading = false,
    this.outline = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        width: double.infinity,
        height: 48,
        decoration: BoxDecoration(
          color: outline ? Colors.transparent : AppTheme.primaryContainer,
          border: outline ? Border.all(color: AppTheme.outline.withValues(alpha: 0.35)) : null,
        ),
        alignment: Alignment.center,
        child: isLoading
            ? const SizedBox(width: 16, height: 16,
                child: CircularProgressIndicator(color: AppTheme.onPrimaryFixed, strokeWidth: 1.5))
            : Text(label.toUpperCase(),
                style: TextStyle(
                  fontFamily: 'Inter', fontSize: 11, fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                  color: outline ? AppTheme.secondary : AppTheme.onPrimaryFixed)),
      ),
    );
  }
}
