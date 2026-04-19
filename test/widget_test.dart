import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:rock_app/main.dart';
import 'package:rock_app/core/providers/auth_provider.dart';

class _TestAuthNotifier extends AuthNotifier {
  @override
  AuthState build() => const AuthUnauthenticated();
}

void main() {
  testWidgets('App launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authProvider.overrideWith(_TestAuthNotifier.new),
        ],
        child: const RockApp(),
      ),
    );
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
