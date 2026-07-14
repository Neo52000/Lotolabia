import 'package:flutter/material.dart';

/// Charte LotoLab IA.
abstract final class BrandColors {
  static const nightBlue = Color(0xFF0D1B2A);
  static const blue = Color(0xFF00B4FF);
  static const violet = Color(0xFF9D4EDD);
  static const pink = Color(0xFFFF4D8D);
  static const yellow = Color(0xFFFFC107);
  static const green = Color(0xFF22C55E);
}

ThemeData _base(Brightness brightness) {
  final scheme = ColorScheme.fromSeed(
    seedColor: BrandColors.blue,
    primary: brightness == Brightness.dark ? BrandColors.blue : const Color(0xFF0077B6),
    secondary: BrandColors.violet,
    tertiary: BrandColors.pink,
    surface: brightness == Brightness.dark ? BrandColors.nightBlue : Colors.white,
    brightness: brightness,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor:
        brightness == Brightness.dark ? const Color(0xFF091320) : const Color(0xFFF5F8FB),
    appBarTheme: AppBarTheme(
      backgroundColor: brightness == Brightness.dark ? BrandColors.nightBlue : Colors.white,
      centerTitle: false,
    ),
    cardTheme: const CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16))),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}

final lightTheme = _base(Brightness.light);
final darkTheme = _base(Brightness.dark);
