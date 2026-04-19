import 'package:flutter/material.dart';

// ── Obsidian Sentinel Design System ──────────────────────────────────────────
// Brutalist, high-contrast, aerospace-grade tactical interface.
// Zero border radius, dark background, salmon-coral primary.
// ─────────────────────────────────────────────────────────────────────────────

class AppTheme {
  AppTheme._();

  // ── Core Palette ──────────────────────────────────────────────────────────
  static const Color background             = Color(0xFF131313);
  static const Color surfaceContainerLowest = Color(0xFF1A1A1A);
  static const Color surfaceContainerLow    = Color(0xFF1F1F1F);
  static const Color surfaceContainer       = Color(0xFF242424);
  static const Color surfaceContainerHigh   = Color(0xFF2A2A2A);
  static const Color surfaceContainerHighest= Color(0xFF323232);

  static const Color primary           = Color(0xFFFFB3AD);
  static const Color primaryContainer  = Color(0xFF8B2018);
  static const Color onPrimaryFixed    = Color(0xFFFFECEB);
  static const Color secondary         = Color(0xFF94A3B8);
  static const Color onSurface        = Color(0xFFE2E8F0);
  static const Color onSurfaceVariant  = Color(0xFF94A3B8);
  static const Color outline           = Color(0xFF475569);
  static const Color outlineVariant    = Color(0xFF334155);

  static const Color errorContainer    = Color(0xFF3B0D0D);
  static const Color onErrorContainer  = Color(0xFFFFB3B3);
  static const Color amberWarning      = Color(0xFFFBBF24);

  static const Color errorRedHud       = Color(0xFFFF4C4C);
  static const Color error             = Color(0xFFFF6B6B);
  static const Color riskLow           = Color(0xFF10B981);
  static const Color riskMedium        = Color(0xFFF59E0B);
  static const Color riskHigh          = Color(0xFFEF4444);
  static const Color riskNominal       = Color(0xFF3B82F6);
  static const Color glassBackground   = Color(0xAA131313);
  static const Color secondaryContainer= Color(0xFF334155);
  static const Color onSecondaryContainer= Color(0xFFF8FAFC);
  static const Color tertiaryContainer = Color(0xFF0F172A);
  static const Color onTertiaryContainer= Color(0xFFF8FAFC);

  // ── Typography helpers (no GoogleFonts dep) ───────────────────────────────
  // SpaceGrotesk / Inter declared in pubspec or fall back to system sans-serif
  static const String _heading = 'SpaceGrotesk';
  static const String _body    = 'Inter';

  static TextStyle _h(double size, FontWeight w, [Color? c]) => TextStyle(
    fontFamily: _heading,
    fontSize: size,
    fontWeight: w,
    color: c ?? onSurface,
    letterSpacing: 0,
  );
  static TextStyle _b(double size, FontWeight w, [Color? c]) => TextStyle(
    fontFamily: _body,
    fontSize: size,
    fontWeight: w,
    color: c ?? onSurface,
  );

  static final TextTheme _textTheme = TextTheme(
    displayLarge:   _h(57, FontWeight.w700),
    displayMedium:  _h(45, FontWeight.w700),
    displaySmall:   _h(36, FontWeight.w700),
    headlineLarge:  _h(32, FontWeight.w700),
    headlineMedium: _h(28, FontWeight.w600),
    headlineSmall:  _h(24, FontWeight.w600),
    titleLarge:     _h(22, FontWeight.w600),
    titleMedium:    _h(16, FontWeight.w600),
    titleSmall:     _h(14, FontWeight.w600),
    bodyLarge:      _b(16, FontWeight.w400),
    bodyMedium:     _b(14, FontWeight.w400),
    bodySmall:      _b(12, FontWeight.w400, onSurfaceVariant),
    labelLarge:     _b(14, FontWeight.w600),
    labelMedium:    _b(12, FontWeight.w500, onSurfaceVariant),
    labelSmall:     _b(11, FontWeight.w500, onSurfaceVariant),
  );

  // ── Main Theme ────────────────────────────────────────────────────────────
  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: background,
    colorScheme: const ColorScheme.dark(
      brightness:       Brightness.dark,
      primary:          primary,
      onPrimary:        Color(0xFF1A0200),
      primaryContainer: primaryContainer,
      onPrimaryContainer: onPrimaryFixed,
      secondary:        secondary,
      onSecondary:      background,
      surface:          surfaceContainer,
      onSurface:        onSurface,
      onSurfaceVariant: onSurfaceVariant,
      outline:          outline,
      outlineVariant:   outlineVariant,
      error:            Color(0xFFFF6B6B),
      onError:          background,
      errorContainer:   errorContainer,
      onErrorContainer: onErrorContainer,
    ),
    textTheme: _textTheme,

    // ── Zero border radius everywhere ────────────────────────────────────
    appBarTheme: const AppBarTheme(
      backgroundColor:  surfaceContainerLowest,
      foregroundColor:  onSurface,
      elevation:        0,
      scrolledUnderElevation: 0,
      centerTitle:      false,
      titleTextStyle: TextStyle(
        fontFamily: 'SpaceGrotesk',
        fontSize:   11,
        fontWeight: FontWeight.w700,
        letterSpacing: 2.0,
        color:      outline,
      ),
      iconTheme: IconThemeData(color: onSurface, size: 20),
    ),

    cardTheme: const CardThemeData(
      color:     surfaceContainer,
      elevation: 0,
      margin:    EdgeInsets.zero,
      shape:     RoundedRectangleBorder(borderRadius: BorderRadius.zero),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryContainer,
        foregroundColor: onPrimaryFixed,
        elevation:       0,
        shape:           const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        textStyle:       const TextStyle(
          fontFamily: 'SpaceGrotesk',
          fontSize:   11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side:            const BorderSide(color: primary, width: 1),
        shape:           const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
        textStyle:       const TextStyle(
          fontFamily: 'SpaceGrotesk',
          fontSize:   11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      ),
    ),

    inputDecorationTheme: const InputDecorationTheme(
      filled:      true,
      fillColor:   surfaceContainerHigh,
      border:      OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide:   BorderSide(color: outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide:   BorderSide(color: outlineVariant),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide:   BorderSide(color: primary, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide:   BorderSide(color: Color(0xFFFF6B6B)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.zero,
        borderSide:   BorderSide(color: Color(0xFFFF6B6B), width: 1.5),
      ),
      labelStyle:  TextStyle(fontFamily: 'Inter', fontSize: 9,
        letterSpacing: 1.5, color: onSurfaceVariant),
      hintStyle:   TextStyle(fontFamily: 'Inter', fontSize: 13,
        color: outline),
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor:     surfaceContainerLowest,
      selectedItemColor:   primary,
      unselectedItemColor: Color(0xFF475569),
      type:                BottomNavigationBarType.fixed,
      elevation:           0,
      selectedLabelStyle: TextStyle(fontFamily: 'Inter', fontSize: 9,
        fontWeight: FontWeight.w700, letterSpacing: 1.5),
      unselectedLabelStyle: TextStyle(fontFamily: 'Inter', fontSize: 9,
        letterSpacing: 1.2),
    ),

    chipTheme: const ChipThemeData(
      backgroundColor: surfaceContainerHigh,
      selectedColor:   primaryContainer,
      labelStyle:      TextStyle(fontFamily: 'Inter', fontSize: 10,
        color: onSurface),
      shape:           RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      side:            BorderSide(color: outlineVariant),
    ),

    dividerTheme: const DividerThemeData(
      color:      outlineVariant,
      thickness:  1,
      space:      1,
    ),

    snackBarTheme: const SnackBarThemeData(
      backgroundColor: surfaceContainerHighest,
      contentTextStyle: TextStyle(fontFamily: 'Inter', fontSize: 12,
        color: onSurface),
      shape:            RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      behavior:         SnackBarBehavior.floating,
    ),

    dialogTheme: const DialogThemeData(
      backgroundColor: surfaceContainerHigh,
      shape:           RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      titleTextStyle:  TextStyle(fontFamily: 'SpaceGrotesk', fontSize: 16,
        fontWeight: FontWeight.w700, color: onSurface),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: primaryContainer,
      foregroundColor: onPrimaryFixed,
      elevation:       0,
      shape:           RoundedRectangleBorder(borderRadius: BorderRadius.zero),
    ),

    listTileTheme: const ListTileThemeData(
      tileColor:     surfaceContainer,
      iconColor:     secondary,
      textColor:     onSurface,
      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    ),

    drawerTheme: const DrawerThemeData(
      backgroundColor: surfaceContainerLow,
      shape:           RoundedRectangleBorder(borderRadius: BorderRadius.zero),
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) =>
        s.contains(WidgetState.selected) ? primary : outline),
      trackColor: WidgetStateProperty.resolveWith((s) =>
        s.contains(WidgetState.selected)
          ? primaryContainer.withValues(alpha: 0.5)
          : surfaceContainerHighest),
    ),

    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((s) =>
        s.contains(WidgetState.selected) ? primaryContainer : Colors.transparent),
      checkColor: WidgetStateProperty.all(onPrimaryFixed),
      side:       const BorderSide(color: outline, width: 1.5),
      shape:      const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
    ),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color:            primary,
      linearTrackColor: surfaceContainerHighest,
    ),
  );
}
