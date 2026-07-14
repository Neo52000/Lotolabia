import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/widgets.dart';
import '../../data/providers.dart';

/// Simulation Monte-Carlo pédagogique + confrontation d'une grille à l'historique.
class SimulationScreen extends ConsumerStatefulWidget {
  const SimulationScreen({super.key});

  @override
  ConsumerState<SimulationScreen> createState() => _SimulationScreenState();
}

class _SimulationScreenState extends ConsumerState<SimulationScreen> {
  Map<String, dynamic>? _monteCarlo;
  Map<String, dynamic>? _gridResult;
  bool _loading = false;
  String? _error;
  final Set<int> _selected = {};
  int _chance = 1;

  Future<void> _runMonteCarlo() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final result =
          await api.getJson('/api/v1/stats/monte-carlo', query: {'iterations': 10000});
      setState(() => _monteCarlo = result);
    } on Exception catch (error) {
      setState(() => _error = '$error');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _simulateGrid() async {
    if (_selected.length != 5) {
      setState(() => _error = 'Sélectionnez exactement cinq numéros.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final numbers = (_selected.toList()..sort()).join(',');
      final result = await api.getJson(
        '/api/v1/stats/simulate-grid',
        query: {'numbers': numbers, 'chance': _chance},
      );
      setState(() => _gridResult = result);
    } on Exception catch (error) {
      setState(() => _error = '$error');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Simulations')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SectionCard(
            title: 'Probabilités théoriques (Monte-Carlo)',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Simule des milliers de grilles aléatoires contre des tirages aléatoires '
                  'pour illustrer les probabilités réelles du jeu.',
                ),
                const SizedBox(height: 10),
                FilledButton(
                  onPressed: _loading ? null : _runMonteCarlo,
                  child: const Text('Lancer la simulation'),
                ),
                if (_monteCarlo != null) ...[
                  const SizedBox(height: 12),
                  Text('${_monteCarlo!['iterations']} itérations :'),
                  const SizedBox(height: 6),
                  for (final item in (_monteCarlo!['distribution'] as List)
                      .where((item) => item['chance_matched'] == false))
                    Text(
                      '${item['matching_numbers']} bons numéros : '
                      '${((item['ratio'] as num) * 100).toStringAsFixed(3)} %',
                    ),
                  const SizedBox(height: 6),
                  Text(
                    'Rang 1 théorique : 1 chance sur 19 068 840.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Confronter une grille à l\'historique',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (var number = 1; number <= 49; number++)
                      GestureDetector(
                        onTap: () => setState(() {
                          if (_selected.contains(number)) {
                            _selected.remove(number);
                          } else if (_selected.length < 5) {
                            _selected.add(number);
                          }
                        }),
                        child: Container(
                          width: 34,
                          height: 34,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _selected.contains(number)
                                ? Theme.of(context).colorScheme.primary
                                : Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          child: Text(
                            '$number',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _selected.contains(number) ? Colors.white : null,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Text('Numéro Chance : '),
                    DropdownButton<int>(
                      value: _chance,
                      items: [
                        for (var i = 1; i <= 10; i++)
                          DropdownMenuItem(value: i, child: Text('$i')),
                      ],
                      onChanged: (value) => setState(() => _chance = value ?? 1),
                    ),
                  ],
                ),
                FilledButton(
                  onPressed: _loading ? null : _simulateGrid,
                  child: const Text('Analyser cette grille'),
                ),
                if (_gridResult != null) ...[
                  const SizedBox(height: 12),
                  Text('Sur ${_gridResult!['draw_count']} tirages passés :'),
                  const SizedBox(height: 6),
                  for (final item in (_gridResult!['match_distribution'] as List))
                    Text(
                      '${item['matching_numbers']} numéros retrouvés : ${item['draws']} tirages '
                      '(${((item['ratio'] as num) * 100).toStringAsFixed(1)} %)',
                    ),
                  Text('Numéro Chance retrouvé : ${_gridResult!['chance_matches']} fois'),
                ],
              ],
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Card(child: Padding(padding: const EdgeInsets.all(14), child: Text(_error!))),
          ],
          const SizedBox(height: 12),
          const WarningBanner(),
        ],
      ),
    );
  }
}
