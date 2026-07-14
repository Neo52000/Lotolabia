import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:8000',
);

void main() => runApp(const LotoLabApp());

class LotoLabApp extends StatelessWidget {
  const LotoLabApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LotoLab IA',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF17324D)),
        useMaterial3: true,
      ),
      home: const DashboardPage(),
    );
  }
}

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  bool loading = false;
  String? error;
  List<int> numbers = const [];
  int? chance;
  List<Map<String, dynamic>> topNumbers = const [];

  Future<void> loadDashboard() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final results = await Future.wait([
        http.get(Uri.parse('$apiBaseUrl/analysis/grid')),
        http.get(Uri.parse('$apiBaseUrl/analysis/frequencies')),
      ]);

      if (results.any((response) => response.statusCode != 200)) {
        throw Exception('Réponse API invalide');
      }

      final grid = jsonDecode(results[0].body) as Map<String, dynamic>;
      final frequency = jsonDecode(results[1].body) as Map<String, dynamic>;
      final entries = List<Map<String, dynamic>>.from(frequency['numbers'] as List);
      entries.sort((a, b) => (b['count'] as int).compareTo(a['count'] as int));

      setState(() {
        numbers = List<int>.from(grid['numbers'] as List);
        chance = grid['chance'] as int;
        topNumbers = entries.take(10).toList();
      });
    } catch (exception) {
      setState(() => error = exception.toString());
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    loadDashboard();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('LotoLab IA')),
      body: RefreshIndicator(
        onRefresh: loadDashboard,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text(
              'Analyse statistique du Loto',
              style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            const Text(
              'Les résultats passés ne permettent pas de prédire un tirage aléatoire futur.',
            ),
            const SizedBox(height: 24),
            if (loading) const LinearProgressIndicator(),
            if (error != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text('Erreur : $error'),
                ),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Grille pondérée expérimentale',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 14),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        ...numbers.map((number) => NumberBall(label: '$number')),
                        NumberBall(label: chance == null ? '?' : 'C$chance'),
                      ],
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: loading ? null : loadDashboard,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Générer une autre grille'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Numéros les plus fréquents',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ...topNumbers.map(
              (entry) => ListTile(
                leading: CircleAvatar(child: Text('${entry['number']}')),
                title: Text('Numéro ${entry['number']}'),
                trailing: Text('${entry['count']} sorties'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class NumberBall extends StatelessWidget {
  final String label;
  const NumberBall({required this.label, super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 52,
      height: 52,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Theme.of(context).colorScheme.primaryContainer,
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
      ),
    );
  }
}
