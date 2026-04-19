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

  const AlertCard({
    super.key,
    required this.alert,
    required this.currentRole,
    this.onAcknowledge,
    this.onResolve,
  });

  Color get _borderColor => switch (alert.severity) {
    AlertSeverity.critical => AppTheme.primaryContainer,
    AlertSeverity.warning  => AppTheme.amberWarning,
    AlertSeverity.info     => const Color(0xFF334155),
  };

  Color get _labelColor => switch (alert.severity) {
    AlertSeverity.critical => AppTheme.primary,
    AlertSeverity.warning  => AppTheme.amberWarning,
    AlertSeverity.info     => const Color(0xFF64748B),
  };

  String get _severityLabel => switch (alert.severity) {
    AlertSeverity.critical => 'CRITICAL RISK',
    AlertSeverity.warning  => 'ELEVATED RISK',
    AlertSeverity.info     => 'LOW RISK',
  };

  @override
  Widget build(BuildContext context) {
    final canAck     = currentRole.canAcknowledge && alert.status == AlertStatus.active;
    final canResolve = currentRole.canResolve && alert.status != AlertStatus.resolved;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surfaceContainer,
        border: Border(left: BorderSide(color: _borderColor, width: 4)),
        boxShadow: alert.severity == AlertSeverity.critical
            ? [BoxShadow(color: AppTheme.errorRedHud.withValues(alpha: 0.12), blurRadius: 15)]
            : null,
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_severityLabel,
                  style: TextStyle(
                    fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                    letterSpacing: 1.5, color: _labelColor)),
                const SizedBox(height: 4),
                Text(alert.title,
                  style: const TextStyle(
                    fontFamily: 'SpaceGrotesk', fontSize: 16, fontWeight: FontWeight.w700,
                    color: AppTheme.onSurface)),
              ]),
              if (alert.createdAt != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  color: AppTheme.surfaceContainerLowest,
                  child: Text(_timeAgo(alert.createdAt!),
                    style: const TextStyle(
                      fontFamily: 'Courier', fontSize: 9, color: Color(0xFF64748B))),
                ),
            ],
          ),
          if (alert.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(alert.description,
              style: const TextStyle(
                fontFamily: 'Inter', fontSize: 12, color: AppTheme.onSurfaceVariant,
                height: 1.4)),
          ],
          if (alert.location != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.location_on, size: 12, color: Color(0xFF64748B)),
              const SizedBox(width: 4),
              Text(alert.location!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ]),
          ],
          if (canAck || canResolve) ...[
            const SizedBox(height: 12),
            Row(children: [
              if (canAck)
                Expanded(
                  child: GestureDetector(
                    onTap: onAcknowledge,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppTheme.surfaceContainerHighest,
                      alignment: Alignment.center,
                      child: const Text('ACKNOWLEDGE',
                        style: TextStyle(
                          fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                          letterSpacing: 1.5, color: AppTheme.onSurface)),
                    ),
                  ),
                ),
              if (canAck && canResolve) const SizedBox(width: 8),
              if (canResolve)
                Expanded(
                  child: GestureDetector(
                    onTap: onResolve,
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      color: AppTheme.primaryContainer,
                      alignment: Alignment.center,
                      child: const Text('RESOLVE',
                        style: TextStyle(
                          fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                          letterSpacing: 1.5, color: AppTheme.onPrimaryFixed)),
                    ),
                  ),
                ),
            ]),
          ],
        ],
      ),
    );
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m AGO';
    if (diff.inHours < 24)   return '${diff.inHours}h AGO';
    return '${diff.inDays}d AGO';
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
