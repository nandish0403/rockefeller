import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'core/providers/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/dashboard_screen.dart';
import 'features/map_zones/map_screen.dart';
import 'features/alerts/alerts_screen.dart';
import 'features/reports/reports_screen.dart';
import 'features/crack_reports/crack_reports_screen.dart';
import 'features/blasts/blasts_screen.dart';
import 'features/explorations/explorations_screen.dart';
import 'features/predictions/predictions_screen.dart';
import 'features/notifications/notifications_screen.dart';
import 'features/profile/profile_screen.dart';
import 'features/admin/admin_screen.dart';
import 'shared/shell_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final rootKey = GlobalKey<NavigatorState>();
  final shellKey = GlobalKey<NavigatorState>();
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: rootKey,
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = authState is AuthAuthenticated;
      final isLoading = authState is AuthInitial || authState is AuthLoading;
      final isLogin = state.matchedLocation == '/login';
      final isSplash = state.matchedLocation == '/splash';

      if (isLoading) return isSplash ? null : '/splash';
      if (!isLoading && isSplash) return isAuth ? '/' : '/login';
      if (!isAuth && !isLogin) return '/login';
      if (isAuth && isLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (_, __) => const _SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (_, __) => const LoginScreen(),
      ),
      ShellRoute(
        navigatorKey: shellKey,
        builder: (_, __, child) => ShellScreen(child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/map', builder: (_, __) => const MapScreen()),
          GoRoute(path: '/alerts', builder: (_, __) => const AlertsScreen()),
          GoRoute(
            path: '/reports',
            builder: (_, __) => const ReportsScreen(),
            routes: [
              GoRoute(path: 'create', builder: (_, __) => const CreateReportScreen()),
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    ReportDetailScreen(reportId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/crack-reports',
            builder: (_, __) => const CrackReportsScreen(),
            routes: [
              GoRoute(path: 'create', builder: (_, __) => const CreateCrackReportScreen()),
              GoRoute(
                path: ':id',
                builder: (_, state) =>
                    CrackReportDetailScreen(reportId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(
            path: '/blasts',
            builder: (_, __) => const BlastsScreen(),
            routes: [
              GoRoute(path: 'create', builder: (_, __) => const CreateBlastScreen()),
            ],
          ),
          GoRoute(
            path: '/explorations',
            builder: (_, __) => const ExplorationsScreen(),
            routes: [
              GoRoute(path: 'create', builder: (_, __) => const CreateExplorationScreen()),
            ],
          ),
          GoRoute(path: '/predictions', builder: (_, __) => const PredictionsScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/admin', builder: (_, state) {
            // Role guard is enforced in the screen itself
            return const AdminScreen();
          }),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: const Color(0xFF131313),
      body: Center(
        child: Text('404 — Page not found', style: const TextStyle(color: Colors.white)),
      ),
    ),
  );
});

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: Color(0xFF131313),
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
