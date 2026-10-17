/// Simulation Monte-Carlo (grilles aléatoires contre tirages aléatoires)
/// exécutée sur l'appareil quand l'API n'est pas joignable — port fidèle de
/// `web/src/lib/monteCarloFallback.ts`. Purement combinatoire : aucune donnée
/// de tirage réelle nécessaire.
library;

import 'dart:math';

import '../core/disclaimers.dart';

List<int> _sample5(Random rng) {
  final pool = List<int>.generate(49, (i) => i + 1);
  return [for (var i = 0; i < 5; i++) pool.removeAt(rng.nextInt(pool.length))];
}

/// Même forme de réponse que `GET /api/v1/stats/monte-carlo`.
Map<String, dynamic> simulateRandomPlay({int iterations = 1000, int? seed}) {
  final rng = seed == null ? Random() : Random(seed);
  final outcomes = <String, int>{};
  for (var i = 0; i < iterations; i++) {
    final grid = _sample5(rng).toSet();
    final gridChance = rng.nextInt(10) + 1;
    final winning = _sample5(rng).toSet();
    final winningChance = rng.nextInt(10) + 1;
    final matched = grid.where(winning.contains).length;
    final key = '$matched:${gridChance == winningChance}';
    outcomes[key] = (outcomes[key] ?? 0) + 1;
  }

  final distribution = <Map<String, dynamic>>[];
  for (var matched = 0; matched <= 5; matched++) {
    for (final chanceHit in [false, true]) {
      final count = outcomes['$matched:$chanceHit'] ?? 0;
      distribution.add({
        'matching_numbers': matched,
        'chance_matched': chanceHit,
        'count': count,
        'ratio': (count / iterations * 1000000).round() / 1000000,
      });
    }
  }

  return {
    'kind': 'random_play',
    'iterations': iterations,
    'seed': seed,
    'distribution': distribution,
    'theoretical_jackpot_probability': 1 / 19068840,
    'explanation': 'Simulation de grilles aléatoires contre des tirages aléatoires, pour illustrer '
        'les probabilités théoriques (1 chance sur 19 068 840 pour le rang 1 : '
        '5 bons numéros sur 49 et le bon numéro Chance sur 10).',
    'disclaimer': Disclaimers.stats,
  };
}
