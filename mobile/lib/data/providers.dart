import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../core/api_client.dart';
import '../core/config.dart';
import '../core/disclaimers.dart';
import 'generator_fallback.dart' as generator_fallback;
import 'models.dart';
import 'monte_carlo_fallback.dart';
import 'stats_fallback.dart';
import 'supabase_draws.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

final supabaseDrawsProvider =
    Provider<SupabaseDrawsSource>((ref) => SupabaseDrawsSource(Supabase.instance.client));

/// Repli Supabase possible (surchargé dans les tests).
final supabaseFallbackEnabledProvider = Provider<bool>((ref) => AppConfig.supabaseConfigured);

/// Interroge l'API ; si elle n'est pas configurée ou ne répond pas, et que
/// Supabase est configuré, calcule le résultat à partir de Supabase (comme le
/// site web). Une vraie erreur renvoyée par l'API ne déclenche aucun repli.
Future<T> _withFallback<T>(
  bool fallbackEnabled,
  Future<T> Function() fromApi,
  Future<T> Function() fallback,
) async {
  try {
    return await fromApi();
  } on ApiUnreachableException {
    if (!fallbackEnabled) rethrow;
    return fallback();
  }
}

/// Historique complet (ordre croissant), chargé une seule fois depuis
/// Supabase et partagé par tous les calculs locaux.
final allDrawsProvider = FutureProvider<List<Draw>>((ref) async {
  return ref.watch(supabaseDrawsProvider).allDraws();
});

/// Lit l'historique partagé ; en cas d'échec (réseau), l'oublie pour que le
/// prochain « Réessayer » relance réellement le chargement.
Future<List<Draw>> _allDraws(Ref ref) async {
  try {
    return await ref.read(allDrawsProvider.future);
  } catch (_) {
    ref.invalidate(allDrawsProvider);
    rethrow;
  }
}

/// Session Supabase (null si non connecté ou Supabase non configuré).
final authStateProvider = StreamProvider<Session?>((ref) {
  if (!AppConfig.supabaseConfigured) return Stream.value(null);
  return Supabase.instance.client.auth.onAuthStateChange.map((event) => event.session);
});

final isSignedInProvider = Provider<bool>((ref) {
  final auth = ref.watch(authStateProvider);
  return auth.valueOrNull != null;
});

/// Fenêtre d'analyse sélectionnée (nombre de derniers tirages ; null = tout).
final analysisWindowProvider = StateProvider<int?>((ref) => null);

// ---------------------------------------------------------------- tirages
final latestDrawProvider = FutureProvider<Draw>((ref) async {
  final api = ref.watch(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () async => Draw.fromJson(await api.getJson('/api/v1/draws/latest')),
    () => ref.read(supabaseDrawsProvider).latestDraw(),
  );
});

final drawsPageProvider =
    FutureProvider.family<DrawPage, int>((ref, page) async {
  final api = ref.watch(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () async => DrawPage.fromJson(
      await api.getJson('/api/v1/draws', query: {'page': page, 'page_size': 20}),
    ),
    () => ref.read(supabaseDrawsProvider).drawsPage(page, 20),
  );
});

final drawDetailProvider = FutureProvider.family<Draw, String>((ref, date) async {
  final api = ref.watch(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () async => Draw.fromJson(await api.getJson('/api/v1/draws/$date')),
    () => ref.read(supabaseDrawsProvider).drawByDate(date),
  );
});

// ---------------------------------------------------------------- statistiques
Map<String, dynamic> _windowQuery(int? window) =>
    window == null ? {} : {'window': window};

final overviewProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.getJson('/api/v1/stats/overview', query: _windowQuery(window)),
    () async => computeOverview(
      applyWindow(await _allDraws(ref), window),
      Disclaimers.stats,
    ),
  );
});

final frequenciesProvider = FutureProvider<StatsResult>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return StatsResult.fromJson(await _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.getJson('/api/v1/stats/frequencies', query: _windowQuery(window)),
    () async => computeFrequencies(
      applyWindow(await _allDraws(ref), window),
      Disclaimers.stats,
    ),
  ));
});

final delaysProvider = FutureProvider<StatsResult>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return StatsResult.fromJson(await _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.getJson('/api/v1/stats/delays', query: _windowQuery(window)),
    () async => computeDelays(
      applyWindow(await _allDraws(ref), window),
      Disclaimers.stats,
    ),
  ));
});

final shapesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/shapes', query: _windowQuery(window));
});

final pairsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/pairs', query: _windowQuery(window));
});

final tripletsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final window = ref.watch(analysisWindowProvider);
  return api.getJson('/api/v1/stats/triplets', query: _windowQuery(window));
});

final numberProfileProvider =
    FutureProvider.family<Map<String, dynamic>, int>((ref, number) async {
  final api = ref.watch(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.getJson('/api/v1/stats/numbers/$number'),
    () async => computeNumberProfile(
      await _allDraws(ref),
      number,
      isChance: false,
      disclaimer: Disclaimers.stats,
    ),
  );
});

// ---------------------------------------------------------------- compte
final myProfileProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  ref.watch(authStateProvider);
  return api.getJson('/api/v1/me', cacheable: false);
});

final myGridsProvider = FutureProvider<List<SavedGrid>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/grids');
  return rows.map((row) => SavedGrid.fromJson(row as Map<String, dynamic>)).toList();
});

final myFavoritesProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/favorites');
  return rows.cast<Map<String, dynamic>>();
});

final myNotificationsProvider = FutureProvider<List<AppNotification>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final rows = await api.getJsonList('/api/v1/me/notifications');
  return rows.map((row) => AppNotification.fromJson(row as Map<String, dynamic>)).toList();
});

final myPreferencesProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getJson('/api/v1/me/preferences', cacheable: false);
});

// ---------------------------------------------------------------- actions
/// `POST /api/v1/generator`, ou génération locale si l'API n'est pas joignable.
Future<Map<String, dynamic>> generateGrids(
  WidgetRef ref, {
  required String method,
  required int count,
  int? seed,
  required List<int> excludedNumbers,
  required List<int> favoriteNumbers,
}) {
  final api = ref.read(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.postJson('/api/v1/generator', {
      'method': method,
      'count': count,
      if (seed != null) 'seed': seed,
      'excluded_numbers': excludedNumbers,
      'favorite_numbers': favoriteNumbers,
    }),
    () async => generator_fallback.generateGrids(
      method: method,
      count: count,
      seed: seed,
      excludedNumbers: excludedNumbers,
      favoriteNumbers: favoriteNumbers,
      draws: generator_fallback.methodsNeedingDraws.contains(method)
          ? await _allDrawsFromWidget(ref)
          : const [],
    ),
  );
}

Future<List<Draw>> _allDrawsFromWidget(WidgetRef ref) async {
  try {
    return await ref.read(allDrawsProvider.future);
  } catch (_) {
    ref.invalidate(allDrawsProvider);
    rethrow;
  }
}

/// `GET /api/v1/stats/monte-carlo`, ou simulation locale si l'API n'est pas joignable.
Future<Map<String, dynamic>> runMonteCarlo(WidgetRef ref, {required int iterations}) {
  final api = ref.read(apiClientProvider);
  return _withFallback(
    ref.read(supabaseFallbackEnabledProvider),
    () => api.getJson('/api/v1/stats/monte-carlo', query: {'iterations': iterations}),
    () async => simulateRandomPlay(iterations: iterations),
  );
}
