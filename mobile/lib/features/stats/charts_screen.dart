import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../data/providers.dart';

/// Graphiques historiques : histogramme des fréquences et des retards.
class ChartsScreen extends ConsumerWidget {
  const ChartsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final frequencies = ref.watch(frequenciesProvider);
    final delays = ref.watch(delaysProvider);
    final window = ref.watch(analysisWindowProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Graphiques')),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          WindowSelector(
            value: window,
            onChanged: (value) => ref.read(analysisWindowProvider.notifier).state = value,
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Fréquence de sortie par numéro',
            child: SizedBox(
              height: 220,
              child: frequencies.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: Text('$error')),
                data: (stats) => BarChart(
                  BarChartData(
                    gridData: const FlGridData(show: false),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(),
                      rightTitles: const AxisTitles(),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          interval: 8,
                          getTitlesWidget: (value, meta) => Text(
                            '${value.toInt()}',
                            style: const TextStyle(fontSize: 10),
                          ),
                        ),
                      ),
                    ),
                    barGroups: [
                      for (final stat in stats.numbers)
                        BarChartGroupData(
                          x: stat.number,
                          barRods: [
                            BarChartRodData(
                              toY: (stat.count ?? 0).toDouble(),
                              width: 4,
                              color: BrandColors.blue,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SectionCard(
            title: 'Retard actuel par numéro',
            child: SizedBox(
              height: 220,
              child: delays.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (error, _) => Center(child: Text('$error')),
                data: (stats) => BarChart(
                  BarChartData(
                    gridData: const FlGridData(show: false),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      topTitles: const AxisTitles(),
                      rightTitles: const AxisTitles(),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          interval: 8,
                          getTitlesWidget: (value, meta) => Text(
                            '${value.toInt()}',
                            style: const TextStyle(fontSize: 10),
                          ),
                        ),
                      ),
                    ),
                    barGroups: [
                      for (final stat in stats.numbers)
                        BarChartGroupData(
                          x: stat.number,
                          barRods: [
                            BarChartRodData(
                              toY: (stat.delay ?? 0).toDouble(),
                              width: 4,
                              color: BrandColors.violet,
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          const WarningBanner(),
        ],
      ),
    );
  }
}
