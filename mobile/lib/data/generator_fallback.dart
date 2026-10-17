/// Générateur de grilles exécuté sur l'appareil quand l'API n'est pas
/// joignable — port fidèle de `web/src/lib/generatorFallback.ts` (6 méthodes
/// de `backend/app/generator/grids.py`). L'avertissement obligatoire est
/// systématiquement attaché à chaque grille.
library;

import 'dart:math';

import '../core/disclaimers.dart';
import 'models.dart';

const generatorMethodLabels = {
  'random': 'Aléatoire pur',
  'frequency': 'Pondération par fréquence historique',
  'delay': 'Pondération par retard observé',
  'balanced': 'Équilibrage pair/impair et bas/haut',
  'sum_controlled': 'Contrôle de la somme des numéros',
  'diversified': 'Diversification entre grilles',
};

/// Méthodes qui ont besoin de l'historique réel des tirages.
const methodsNeedingDraws = {'frequency', 'delay'};

const _maxAttempts = 500;

List<int> _sampleWithoutReplacement(Random rng, List<int> pool, int count) {
  final copy = [...pool];
  final picked = <int>[];
  for (var i = 0; i < count && copy.isNotEmpty; i++) {
    picked.add(copy.removeAt(rng.nextInt(copy.length)));
  }
  return picked;
}

/// Tirage pondéré avec remise (façon `random.choices`) jusqu'à 5 numéros distincts.
List<int> _pickWeighted(Random rng, List<int> pool, List<int> weights, Set<int> base) {
  final selected = {...base};
  final totalWeight = weights.fold<int>(0, (sum, w) => sum + w);
  var guard = 0;
  while (selected.length < 5 && guard < 10000) {
    var target = rng.nextDouble() * totalWeight;
    var chosen = pool.last;
    for (var i = 0; i < pool.length; i++) {
      target -= weights[i];
      if (target <= 0) {
        chosen = pool[i];
        break;
      }
    }
    selected.add(chosen);
    guard++;
  }
  if (selected.length < 5) {
    selected.addAll(_sampleWithoutReplacement(
      rng,
      pool.where((n) => !selected.contains(n)).toList(),
      5 - selected.length,
    ));
  }
  return selected.toList()..sort();
}

List<int> _candidatePool(List<int> excluded, List<int> favorites) {
  final excludedSet = excluded.where((n) => !favorites.contains(n)).toSet();
  final pool = [for (var n = 1; n <= 49; n++) if (!excludedSet.contains(n)) n];
  if (pool.length < 5) {
    throw const ApiException('Trop de numéros exclus pour former une grille.');
  }
  return pool;
}

List<int> _weightsByFrequency(List<Draw> draws, List<int> pool) {
  final counts = <int, int>{};
  for (final draw in draws) {
    for (final n in draw.numbers) {
      counts[n] = (counts[n] ?? 0) + 1;
    }
  }
  // Lissage +1 : les numéros jamais sortis restent tirables.
  return [for (final n in pool) (counts[n] ?? 0) + 1];
}

/// Plus un numéro est absent depuis longtemps, plus son poids est élevé.
List<int> _weightsByDelay(List<Draw> draws, List<int> pool) {
  final lastSeen = <int, int?>{for (var n = 1; n <= 49; n++) n: null};
  final reversed = draws.reversed.toList();
  for (var index = 0; index < reversed.length; index++) {
    for (final n in reversed[index].numbers) {
      if (lastSeen.containsKey(n) && lastSeen[n] == null) lastSeen[n] = index;
    }
  }
  final horizon = draws.length;
  return [for (final n in pool) (lastSeen[n] ?? horizon) + 1];
}

bool isBalanced(List<int> numbers) {
  final even = numbers.where((n) => n.isEven).length;
  final low = numbers.where((n) => n <= 24).length;
  return even >= 2 && even <= 3 && low >= 2 && low <= 3;
}

List<int> _generateSingle({
  required String method,
  required List<int> pool,
  required Set<int> favorites,
  required List<Draw> draws,
  required int? sumMin,
  required int? sumMax,
  required Random rng,
  required List<List<int>> previous,
}) {
  for (var attempt = 0; attempt < _maxAttempts; attempt++) {
    final List<int> numbers;
    if (method == 'frequency') {
      numbers = _pickWeighted(rng, pool, _weightsByFrequency(draws, pool), favorites);
    } else if (method == 'delay') {
      numbers = _pickWeighted(rng, pool, _weightsByDelay(draws, pool), favorites);
    } else {
      final free = pool.where((n) => !favorites.contains(n)).toList();
      numbers = [...favorites, ..._sampleWithoutReplacement(rng, free, 5 - favorites.length)]
        ..sort();
    }

    if (method == 'balanced' && !isBalanced(numbers)) continue;
    if (method == 'sum_controlled') {
      final total = numbers.fold<int>(0, (sum, n) => sum + n);
      if (total < (sumMin ?? 100) || total > (sumMax ?? 150)) continue;
    }
    if (method == 'diversified' && previous.isNotEmpty) {
      // Au plus 2 numéros en commun avec chaque grille déjà générée dans ce lot.
      final overlapsTooMuch =
          previous.any((prior) => numbers.where(prior.contains).length > 2);
      if (overlapsTooMuch) continue;
    }
    return numbers;
  }
  throw const ApiException(
    'Impossible de générer une grille respectant ces contraintes. Assouplissez-les.',
  );
}

/// Même forme de réponse que `POST /api/v1/generator` : `{'grids': [...]}`.
Map<String, dynamic> generateGrids({
  required String method,
  int count = 1,
  int? seed,
  List<int> excludedNumbers = const [],
  List<int> favoriteNumbers = const [],
  int? sumMin,
  int? sumMax,
  List<Draw> draws = const [],
}) {
  if (!generatorMethodLabels.containsKey(method)) {
    throw ApiException('Méthode inconnue : $method');
  }
  if (sumMin != null && sumMax != null && sumMin > sumMax) {
    throw const ApiException('La somme minimale dépasse la somme maximale.');
  }
  if (favoriteNumbers.length > 5) {
    throw const ApiException('Au maximum cinq numéros favoris.');
  }

  final rng = seed == null ? Random() : Random(seed);
  final pool = _candidatePool(excludedNumbers, favoriteNumbers);
  final favorites = favoriteNumbers.toSet();
  final generated = <List<int>>[];
  final grids = <Map<String, dynamic>>[];

  for (var i = 0; i < count; i++) {
    final numbers = _generateSingle(
      method: method,
      pool: pool,
      favorites: favorites,
      draws: draws,
      sumMin: sumMin,
      sumMax: sumMax,
      rng: rng,
      previous: generated,
    );
    generated.add(numbers);
    grids.add({
      'numbers': numbers,
      'chance': rng.nextInt(10) + 1,
      'method': method,
      'method_label': generatorMethodLabels[method],
      'seed': seed,
      'warning': Disclaimers.stats,
    });
  }
  return {'grids': grids};
}
