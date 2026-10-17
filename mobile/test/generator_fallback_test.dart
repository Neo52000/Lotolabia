import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/data/generator_fallback.dart';
import 'package:lotolab_ia/data/models.dart';

const _forbidden = ['gagnant', 'sûr', 'prédiction fiable', 'garantie'];

const _draws = [
  Draw(id: 1, drawDate: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test'),
  Draw(id: 2, drawDate: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test'),
];

List<GeneratedGrid> _grids(Map<String, dynamic> response) => (response['grids'] as List)
    .map((grid) => GeneratedGrid.fromJson(grid as Map<String, dynamic>))
    .toList();

void main() {
  group('méthode random', () {
    test('5 numéros distincts entre 1 et 49, Chance entre 1 et 10', () {
      final grid = _grids(generateGrids(method: 'random', seed: 42)).single;
      expect(grid.numbers.toSet(), hasLength(5));
      expect(grid.numbers.every((n) => n >= 1 && n <= 49), isTrue);
      expect(grid.chance, inInclusiveRange(1, 10));
    });

    test('reproductible avec la même graine', () {
      expect(generateGrids(method: 'random', seed: 123), generateGrids(method: 'random', seed: 123));
    });

    test('respecte favoris et exclusions', () {
      final grid = _grids(generateGrids(
        method: 'random',
        seed: 7,
        favoriteNumbers: [1, 2],
        excludedNumbers: [3, 4, 5, 6],
      )).single;
      expect(grid.numbers, containsAll([1, 2]));
      for (final excluded in [3, 4, 5, 6]) {
        expect(grid.numbers, isNot(contains(excluded)));
      }
    });

    test("n'utilise jamais de vocabulaire proscrit et porte l'avertissement", () {
      for (final grid in _grids(generateGrids(method: 'random', count: 5, seed: 1))) {
        expect(grid.warning, isNotEmpty);
        final text = '${grid.methodLabel} ${grid.warning}'.toLowerCase();
        for (final phrase in _forbidden) {
          expect(text, isNot(contains(phrase)));
        }
      }
    });
  });

  test('frequency et delay fonctionnent avec ou sans historique', () {
    for (final method in ['frequency', 'delay']) {
      for (final draws in [_draws, const <Draw>[]]) {
        final grid = _grids(generateGrids(method: method, seed: 1, draws: draws)).single;
        expect(grid.numbers.toSet(), hasLength(5));
      }
    }
  });

  test('balanced : toujours 2-3 pairs et 2-3 numéros ≤ 24', () {
    for (var seed = 1; seed <= 20; seed++) {
      final grid = _grids(generateGrids(method: 'balanced', seed: seed)).single;
      expect(isBalanced(grid.numbers), isTrue);
    }
  });

  test('sum_controlled : bornes par défaut et personnalisées', () {
    for (var seed = 1; seed <= 20; seed++) {
      final grid = _grids(generateGrids(method: 'sum_controlled', seed: seed)).single;
      expect(grid.numbers.reduce((a, b) => a + b), inInclusiveRange(100, 150));
    }
    final narrow = _grids(
      generateGrids(method: 'sum_controlled', seed: 5, sumMin: 115, sumMax: 135),
    ).single;
    expect(narrow.numbers.reduce((a, b) => a + b), inInclusiveRange(115, 135));
  });

  test('diversified : au plus 2 numéros communs entre grilles du même lot', () {
    final grids = _grids(generateGrids(method: 'diversified', seed: 3, count: 4));
    for (var i = 0; i < grids.length; i++) {
      for (var j = i + 1; j < grids.length; j++) {
        expect(grids[i].numbers.where(grids[j].numbers.contains).length, lessThanOrEqualTo(2));
      }
    }
  });

  test('contraintes impossibles : erreur explicite', () {
    expect(
      () => generateGrids(method: 'random', excludedNumbers: List.generate(45, (i) => i + 1)),
      throwsA(isA<ApiException>()),
    );
    expect(
      () => generateGrids(method: 'sum_controlled', sumMin: 150, sumMax: 100),
      throwsA(isA<ApiException>()),
    );
  });
}
