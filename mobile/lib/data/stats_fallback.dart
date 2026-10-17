/// Statistiques descriptives calculées sur l'appareil quand l'API n'est pas
/// joignable — port fidèle de `web/src/lib/statsFallback.ts` et
/// `numberProfileFallback.ts` (eux-mêmes alignés sur
/// `backend/app/stats/engine.py`). Les résultats ont le même format JSON que
/// l'API, pour que les écrans existants les affichent sans modification.
///
/// Toutes les fonctions supposent `draws` trié par date croissante.
library;

import 'models.dart';

final mainRange = List<int>.generate(49, (i) => i + 1);
final chanceRange = List<int>.generate(10, (i) => i + 1);

double _round(double value, int decimals) {
  final factor = decimals == 4 ? 10000 : 100;
  return (value * factor).round() / factor;
}

Map<String, dynamic> _base(List<Draw> draws, String explanation, String disclaimer) => {
      'draw_count': draws.length,
      'period_start': draws.isEmpty ? null : draws.first.drawDate,
      'period_end': draws.isEmpty ? null : draws.last.drawDate,
      'explanation': explanation,
      'disclaimer': disclaimer,
    };

List<Draw> applyWindow(List<Draw> draws, int? window) {
  if (window == null || window <= 0 || window >= draws.length) return draws;
  return draws.sublist(draws.length - window);
}

Map<String, dynamic> computeFrequencies(List<Draw> draws, String disclaimer) {
  final mainCounts = <int, int>{};
  final chanceCounts = <int, int>{};
  for (final draw in draws) {
    for (final n in draw.numbers) {
      mainCounts[n] = (mainCounts[n] ?? 0) + 1;
    }
    chanceCounts[draw.chance] = (chanceCounts[draw.chance] ?? 0) + 1;
  }
  final total = draws.length;
  Map<String, dynamic> stat(int n, Map<int, int> counts) {
    final count = counts[n] ?? 0;
    return {'number': n, 'count': count, 'relative': total == 0 ? 0.0 : _round(count / total, 4)};
  }

  return {
    ..._base(
      draws,
      'Fréquence absolue : nombre de sorties du numéro sur la période. '
      'Fréquence relative : part des tirages où le numéro est sorti.',
      disclaimer,
    ),
    'numbers': [for (final n in mainRange) stat(n, mainCounts)],
    'chance': [for (final n in chanceRange) stat(n, chanceCounts)],
  };
}

Map<String, dynamic> computeDelays(List<Draw> draws, String disclaimer) {
  final mainDelay = <int, int?>{for (final n in mainRange) n: null};
  final chanceDelay = <int, int?>{for (final n in chanceRange) n: null};
  final reversed = draws.reversed.toList();
  for (var index = 0; index < reversed.length; index++) {
    final draw = reversed[index];
    for (final n in draw.numbers) {
      if (mainDelay.containsKey(n) && mainDelay[n] == null) mainDelay[n] = index;
    }
    if (chanceDelay.containsKey(draw.chance) && chanceDelay[draw.chance] == null) {
      chanceDelay[draw.chance] = index;
    }
  }
  return {
    ..._base(
      draws,
      'Retard : nombre de tirages écoulés depuis la dernière sortie du numéro '
      '(0 = présent au dernier tirage, null = jamais sorti sur la période). '
      "Un retard élevé n'augmente pas la probabilité de sortie au prochain tirage.",
      disclaimer,
    ),
    'numbers': [for (final n in mainRange) {'number': n, 'delay': mainDelay[n]}],
    'chance': [for (final n in chanceRange) {'number': n, 'delay': chanceDelay[n]}],
  };
}

Map<String, dynamic> computeOverview(List<Draw> draws, String disclaimer) {
  final freq = (computeFrequencies(draws, disclaimer)['numbers'] as List)
      .cast<Map<String, dynamic>>();
  final delays = (computeDelays(draws, disclaimer)['numbers'] as List)
      .cast<Map<String, dynamic>>();

  // Tri stable (à égalité, ordre croissant des numéros), comme `sorted` en Python.
  final byCount = [...freq]..sort((a, b) {
      final diff = (b['count'] as int).compareTo(a['count'] as int);
      return diff != 0 ? diff : (a['number'] as int).compareTo(b['number'] as int);
    });
  final byDelay = delays.where((item) => item['delay'] != null).toList()
    ..sort((a, b) {
      final diff = (b['delay'] as int).compareTo(a['delay'] as int);
      return diff != 0 ? diff : (a['number'] as int).compareTo(b['number'] as int);
    });

  return {
    ..._base(
      draws,
      'Synthèse descriptive : numéros les plus/moins sortis et retards les plus longs.',
      disclaimer,
    ),
    'most_frequent': byCount.take(5).toList(),
    'least_frequent':
        draws.isEmpty ? <Map<String, dynamic>>[] : byCount.sublist(byCount.length - 5).reversed.toList(),
    'longest_delays': byDelay.take(5).toList(),
  };
}

List<Map<String, int>> computeCooccurrences(List<Draw> draws, int number, {int limit = 10}) {
  final counter = <int, int>{}; // ordre d'insertion conservé (LinkedHashMap)
  for (final draw in draws) {
    if (draw.numbers.contains(number)) {
      for (final n in draw.numbers) {
        if (n != number) counter[n] = (counter[n] ?? 0) + 1;
      }
    }
  }
  final entries = counter.entries.toList();
  final order = {for (var i = 0; i < entries.length; i++) entries[i].key: i};
  entries.sort((a, b) {
    final diff = b.value.compareTo(a.value);
    return diff != 0 ? diff : order[a.key]!.compareTo(order[b.key]!);
  });
  return [
    for (final entry in entries.take(limit)) {'number': entry.key, 'count': entry.value},
  ];
}

Map<String, dynamic> computeNumberProfile(
  List<Draw> draws,
  int number, {
  required bool isChance,
  required String disclaimer,
}) {
  final validRange = isChance ? chanceRange : mainRange;
  if (!validRange.contains(number)) {
    throw const ApiException('Numéro hors plage.', statusCode: 422);
  }

  final positions = <int>[];
  final lastDates = <String>[];
  for (var index = 0; index < draws.length; index++) {
    final draw = draws[index];
    final present = isChance ? draw.chance == number : draw.numbers.contains(number);
    if (present) {
      positions.add(index);
      lastDates.add(draw.drawDate);
    }
  }

  final gaps = [for (var i = 1; i < positions.length; i++) positions[i] - positions[i - 1]];
  final total = draws.length;

  return {
    ..._base(
      draws,
      'Profil descriptif du numéro : sorties, fréquence relative, retard actuel et écarts.',
      disclaimer,
    ),
    'number': number,
    'is_chance': isChance,
    'appearances': positions.length,
    'relative_frequency': total == 0 ? 0.0 : _round(positions.length / total, 4),
    'current_delay': positions.isEmpty ? null : total - 1 - positions.last,
    'gap_mean': gaps.isEmpty ? null : _round(gaps.reduce((a, b) => a + b) / gaps.length, 2),
    'gap_min': gaps.isEmpty ? null : gaps.reduce((a, b) => a < b ? a : b),
    'gap_max': gaps.isEmpty ? null : gaps.reduce((a, b) => a > b ? a : b),
    'last_appearances': lastDates.length > 10
        ? lastDates.sublist(lastDates.length - 10).reversed.toList()
        : lastDates.reversed.toList(),
    if (!isChance) 'top_companions': computeCooccurrences(draws, number, limit: 5),
  };
}
