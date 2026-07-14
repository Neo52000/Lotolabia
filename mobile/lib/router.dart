import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'features/account/account_screens.dart';
import 'features/account/premium_screen.dart';
import 'features/draws/draws_screens.dart';
import 'features/generator/generator_screen.dart';
import 'features/home/home_screen.dart';
import 'features/legal/legal_screens.dart';
import 'features/onboarding/onboarding_screen.dart';
import 'features/simulation/simulation_screen.dart';
import 'features/stats/charts_screen.dart';
import 'features/stats/stats_screens.dart';

Future<bool> hasSeenOnboarding() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('onboarding_done') ?? false;
}

GoRouter buildRouter({required bool onboardingDone}) {
  return GoRouter(
    initialLocation: onboardingDone ? '/' : '/onboarding',
    routes: [
      GoRoute(path: '/onboarding', builder: (_, __) => const OnboardingScreen()),
      ShellRoute(
        builder: (context, state, child) => _AppShell(state: state, child: child),
        routes: [
          GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
          GoRoute(path: '/latest', builder: (_, __) => const LatestDrawScreen()),
          GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
          GoRoute(
            path: '/draws/:date',
            builder: (_, state) => DrawDetailScreen(date: state.pathParameters['date']!),
          ),
          GoRoute(path: '/stats/frequencies', builder: (_, __) => const FrequenciesScreen()),
          GoRoute(path: '/stats/delays', builder: (_, __) => const DelaysScreen()),
          GoRoute(path: '/stats/trends', builder: (_, __) => const TrendsScreen()),
          GoRoute(path: '/stats/pairs', builder: (_, __) => const PairsScreen()),
          GoRoute(path: '/stats/triplets', builder: (_, __) => const TripletsScreen()),
          GoRoute(path: '/stats/charts', builder: (_, __) => const ChartsScreen()),
          GoRoute(path: '/generator', builder: (_, __) => const GeneratorScreen()),
          GoRoute(path: '/simulation', builder: (_, __) => const SimulationScreen()),
          GoRoute(path: '/grids', builder: (_, __) => const MyGridsScreen()),
          GoRoute(path: '/favorites', builder: (_, __) => const FavoritesScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
          GoRoute(path: '/preferences', builder: (_, __) => const PreferencesScreen()),
          GoRoute(path: '/premium', builder: (_, __) => const PremiumScreen()),
          GoRoute(path: '/auth', builder: (_, __) => const AuthScreen()),
          GoRoute(path: '/responsible-gaming', builder: (_, __) => const ResponsibleGamingScreen()),
          GoRoute(path: '/privacy', builder: (_, __) => const PrivacyScreen()),
          GoRoute(path: '/delete-account', builder: (_, __) => const DeleteAccountScreen()),
        ],
      ),
    ],
  );
}

/// Coquille de navigation : barre inférieure sur les cinq destinations
/// principales, les autres écrans restent accessibles par navigation interne.
class _AppShell extends StatelessWidget {
  final GoRouterState state;
  final Widget child;
  const _AppShell({required this.state, required this.child});

  static const _tabs = ['/', '/history', '/stats/frequencies', '/generator', '/profile'];

  int get _selectedIndex {
    final location = state.uri.path;
    if (location.startsWith('/history') || location.startsWith('/draws') || location == '/latest') {
      return 1;
    }
    if (location.startsWith('/stats')) return 2;
    if (location.startsWith('/generator') || location.startsWith('/simulation')) return 3;
    if (location.startsWith('/profile') ||
        location.startsWith('/preferences') ||
        location.startsWith('/premium') ||
        location.startsWith('/grids') ||
        location.startsWith('/favorites') ||
        location.startsWith('/notifications') ||
        location.startsWith('/auth') ||
        location.startsWith('/responsible-gaming') ||
        location.startsWith('/privacy') ||
        location.startsWith('/delete-account')) {
      return 4;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) => context.go(_tabs[index]),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Tirages'),
          NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: 'Stats'),
          NavigationDestination(icon: Icon(Icons.casino_outlined), selectedIcon: Icon(Icons.casino), label: 'Grilles'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
