import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/models/app_models.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationProvider);
    final notifier = ref.read(notificationProvider.notifier);

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(66),
        child: Container(
          height: 66,
          color: AppTheme.surfaceContainerLowest,
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'SENTINEL INBOX',
                    style: TextStyle(
                      fontFamily: 'SpaceGrotesk',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 2,
                      color: AppTheme.errorRedHud,
                    ),
                  ),
                  Text(
                    'WhatsApp-style incident updates',
                    style: TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 10,
                      color: AppTheme.onSurfaceVariant.withValues(alpha: 0.85),
                    ),
                  ),
                ],
              ),
              if (state.unreadCount > 0)
                GestureDetector(
                  onTap: notifier.markAllRead,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceContainerHigh,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.primary.withValues(alpha: 0.45)),
                    ),
                    child: const Text(
                      'MARK ALL READ',
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.4,
                        color: AppTheme.primary,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        backgroundColor: AppTheme.surfaceContainerHigh,
        onRefresh: notifier.fetchNotifications,
        child: state.isLoading
            ? const LoadingState(message: 'LOADING NOTIFICATIONS')
            : state.notifications.isEmpty
                ? const EmptyState(message: 'No notifications', icon: Icons.notifications_none)
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(12, 14, 12, 18),
                    separatorBuilder: (_, __) => Container(height: 1,
                      color: AppTheme.outlineVariant.withValues(alpha: 0.08)),
                    itemCount: state.notifications.length,
                    itemBuilder: (_, i) {
                      final n = state.notifications[i];
                      return InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => notifier.handleNotificationTap(n),
                        child: _ChatNotificationTile(notification: n),
                      );
                    },
                  ),
      ),
    );
  }
}

class _ChatNotificationTile extends StatelessWidget {
  final NotificationModel notification;

  const _ChatNotificationTile({required this.notification});

  Color _accentColor(String? type) {
    switch ((type ?? '').toLowerCase()) {
      case 'alert':
        return AppTheme.errorRedHud;
      case 'warning':
        return AppTheme.amberWarning;
      default:
        return AppTheme.primary;
    }
  }

  IconData _iconForType(String? type) {
    switch ((type ?? '').toLowerCase()) {
      case 'alert':
        return Icons.priority_high_rounded;
      case 'warning':
        return Icons.warning_amber_rounded;
      default:
        return Icons.chat_bubble_outline_rounded;
    }
  }

  String _senderLabel(String? type) {
    switch ((type ?? '').toLowerCase()) {
      case 'alert':
        return 'Sentinel Emergency';
      case 'warning':
        return 'Sentinel Warning';
      default:
        return 'Sentinel Ops';
    }
  }

  String _timeLabel(DateTime? dateTime) {
    if (dateTime == null) return '--:--';
    final now = DateTime.now();
    final isToday = now.year == dateTime.year &&
        now.month == dateTime.month &&
        now.day == dateTime.day;
    return isToday ? DateFormat('HH:mm').format(dateTime) : DateFormat('dd MMM').format(dateTime);
  }

  @override
  Widget build(BuildContext context) {
    final accent = _accentColor(notification.type);
    final unread = !notification.isRead;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 5),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: unread ? AppTheme.surfaceContainerLow : AppTheme.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: unread ? accent.withValues(alpha: 0.52) : AppTheme.outlineVariant.withValues(alpha: 0.32),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: accent.withValues(alpha: 0.18),
            child: Icon(_iconForType(notification.type), color: accent, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        _senderLabel(notification.type),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontFamily: 'SpaceGrotesk',
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.onSurface,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _timeLabel(notification.createdAt),
                      style: TextStyle(
                        fontFamily: 'Inter',
                        fontSize: 10,
                        fontWeight: unread ? FontWeight.w700 : FontWeight.w500,
                        color: unread ? accent : AppTheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  notification.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: unread
                        ? accent.withValues(alpha: 0.11)
                        : AppTheme.surfaceContainerHighest.withValues(alpha: 0.28),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    notification.message,
                    style: const TextStyle(
                      fontFamily: 'Inter',
                      fontSize: 12,
                      color: AppTheme.onSurfaceVariant,
                      height: 1.45,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (unread) ...[
            const SizedBox(width: 8),
            Container(
              width: 10,
              height: 10,
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: accent,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(color: accent.withValues(alpha: 0.45), blurRadius: 8),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
