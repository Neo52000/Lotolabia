import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/disclaimers.dart';
import '../../core/widgets.dart';
import '../../data/models.dart';
import '../../data/providers.dart';

class GeneratorScreen extends ConsumerStatefulWidget {
  const GeneratorScreen({super.key});

  @override
  ConsumerState<GeneratorScreen> createState() => _GeneratorScreenState();
}

class _GeneratorScreenState extends ConsumerState<GeneratorScreen> {
  String _method = 'random';
  int _count = 1;
  final _seedController = TextEditingController();
  final Set<int> _excluded = {};
  final Set<int> _favorites = {};
  List<GeneratedGrid> _grids = [];
  bool _loading = false;
  String? _error;
  bool _premiumRequired = false;

  static const _methods = {
    'random': 'Aléatoire pur',
    'frequency': 'Pondération par fréquence',
    'delay': 'Pondération par retard',
    'balanced': 'Équilibrage pair/impair, bas/haut',
    'sum_controlled': 'Contrôle de somme',
    'diversified': 'Diversification',
  };

  Future<void> _generate() async {
    setState(() {
      _loading = true;
      _error = null;
      _premiumRequired = false;
    });
    try {
      final api = ref.read(apiClientProvider);
      final seed = int.tryParse(_seedController.text);
      final response = await api.postJson('/api/v1/generator', {
        'method': _method,
        'count': _count,
        if (seed != null) 'seed': seed,
        'excluded_numbers': _excluded.toList(),
        'favorite_numbers': _favorites.toList(),
      });
      setState(() {
        _grids = (response['grids'] as List)
            .map((grid) => GeneratedGrid.fromJson(grid as Map<String, dynamic>))
            .toList();
      });
    } on PremiumRequiredException catch (error) {
      setState(() {
        _error = error.message;
        _premiumRequired = true;
      });
    } on Exception catch (error) {
      setState(() => _error = '$error');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _saveGrid(GeneratedGrid grid) async {
    try {
      final api = ref.read(apiClientProvider);
      await api.postJson('/api/v1/me/grids', {
        'numbers': grid.numbers,
        'chance': grid.chance,
        'method': grid.methodLabel,
      });
      ref.invalidate(myGridsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Grille enregistrée.')));
      }
    } on PremiumRequiredException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } on Exception catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Générateur de grilles')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const WarningBanner(text: Disclaimers.stats),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Méthode expérimentale',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _method,
                  items: [
                    for (final entry in _methods.entries)
                      DropdownMenuItem(value: entry.key, child: Text(entry.value)),
                  ],
                  onChanged: (value) => setState(() => _method = value ?? 'random'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Text('Nombre de grilles'),
                    Expanded(
                      child: Slider(
                        value: _count.toDouble(),
                        min: 1,
                        max: 20,
                        divisions: 19,
                        label: '$_count',
                        onChanged: (value) => setState(() => _count = value.round()),
                      ),
                    ),
                    Text('$_count'),
                  ],
                ),
                TextField(
                  controller: _seedController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Graine (optionnel, génération reproductible)',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Exclusions et favoris',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Appui court : exclure (rouge). Appui long : favori imposé (vert).',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (var number = 1; number <= 49; number++)
                      GestureDetector(
                        onTap: () => setState(() {
                          _favorites.remove(number);
                          _excluded.contains(number)
                              ? _excluded.remove(number)
                              : _excluded.add(number);
                        }),
                        onLongPress: () => setState(() {
                          _excluded.remove(number);
                          if (_favorites.contains(number)) {
                            _favorites.remove(number);
                          } else if (_favorites.length < 5) {
                            _favorites.add(number);
                          }
                        }),
                        child: Container(
                          width: 34,
                          height: 34,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _excluded.contains(number)
                                ? Colors.red.withValues(alpha: 0.75)
                                : _favorites.contains(number)
                                    ? Colors.green.withValues(alpha: 0.8)
                                    : Theme.of(context).colorScheme.surfaceContainerHighest,
                          ),
                          child: Text(
                            '$number',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: _excluded.contains(number) || _favorites.contains(number)
                                  ? Colors.white
                                  : null,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _loading ? null : _generate,
            icon: _loading
                ? const SizedBox(
                    width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(Icons.casino),
            label: const Text('Générer'),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  children: [
                    Text(_error!),
                    if (_premiumRequired)
                      TextButton(
                        onPressed: () => context.go('/premium'),
                        child: const Text('Découvrir Premium'),
                      ),
                  ],
                ),
              ),
            ),
          ],
          for (final grid in _grids) ...[
            const SizedBox(height: 12),
            SectionCard(
              title: grid.methodLabel,
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.share),
                    tooltip: 'Partager',
                    onPressed: () => Share.share(
                      'Grille expérimentale LotoLab IA : ${grid.numbers.join(" - ")} / '
                      'Chance ${grid.chance}. ${grid.warning}',
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.bookmark_add_outlined),
                    tooltip: 'Enregistrer',
                    onPressed: () => _saveGrid(grid),
                  ),
                ],
              ),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final number in grid.numbers) NumberBall(number: number),
                  NumberBall(number: grid.chance, isChance: true),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
