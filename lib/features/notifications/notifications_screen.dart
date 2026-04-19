import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
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
        preferredSize: const Size.fromHeight(56),
        child: Container(
          height: 56,
          color: AppTheme.surfaceContainerLowest,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('NOTIFICATIONS',
                style: TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 13,
                  fontWeight: FontWeight.w700, letterSpacing: 2, color: AppTheme.errorRedHud)),
              if (state.unreadCount > 0)
                GestureDetector(
                  onTap: notifier.markAllRead,
                  child: const Text('MARK ALL READ',
                    style: TextStyle(fontFamily: 'Inter', fontSize: 9, fontWeight: FontWeight.w700,
                      letterSpacing: 1.5, color: AppTheme.primary)),
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
                    separatorBuilder: (_, __) => Container(height: 1,
                      color: AppTheme.outlineVariant.withValues(alpha: 0.15)),
                    itemCount: state.notifications.length,
                    itemBuilder: (_, i) {
                      final n = state.notifications[i];
                      return GestureDetector(
                        onTap: () => notifier.markRead(n.id),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          color: n.isRead ? AppTheme.background : AppTheme.surfaceContainerLow,
                          child: Row(children: [
                            if (!n.isRead)
                              Container(
                                width: 6, height: 6, margin: const EdgeInsets.only(right: 10),
                                decoration: const BoxDecoration(
                                  color: AppTheme.primary, shape: BoxShape.circle)),
                            if (n.isRead) const SizedBox(width: 16),
                            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(n.title,
                                style: TextStyle(
                                  fontFamily: 'SpaceGrotesk', fontSize: 13,
                                  fontWeight: n.isRead ? FontWeight.w400 : FontWeight.w600,
                                  color: AppTheme.onSurface)),
                              const SizedBox(height: 4),
                              Text(n.message, maxLines: 2, overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontFamily: 'Inter', fontSize: 12,
                                  color: AppTheme.onSurfaceVariant, height: 1.4)),
                              if (n.createdAt != null) ...[
                                const SizedBox(height: 6),
                                Text(DateFormat('MMM d, HH:mm').format(n.createdAt!),
                                  style: const TextStyle(fontFamily: 'Courier', fontSize: 9,
                                    color: Color(0xFF64748B))),
                              ],
                            ])),
                          ]),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
