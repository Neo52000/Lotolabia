/// Modèles typés des réponses de l'API LotoLab IA.
library;

class Draw {
  final int id;
  final String drawDate;
  final List<int> numbers;
  final int chance;
  final String source;

  const Draw({
    required this.id,
    required this.drawDate,
    required this.numbers,
    required this.chance,
    required this.source,
  });

  factory Draw.fromJson(Map<String, dynamic> json) => Draw(
        id: json['id'] as int,
        drawDate: json['draw_date'] as String,
        numbers: List<int>.from(json['numbers'] as List),
        chance: json['chance'] as int,
        source: (json['source'] ?? 'inconnu') as String,
      );
}

class DrawPage {
  final List<Draw> items;
  final int total;
  final bool truncated;

  const DrawPage({required this.items, required this.total, required this.truncated});

  factory DrawPage.fromJson(Map<String, dynamic> json) => DrawPage(
        items: (json['items'] as List)
            .map((item) => Draw.fromJson(item as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int,
        truncated: (json['truncated'] ?? false) as bool,
      );
}

class NumberStat {
  final int number;
  final int? count;
  final double? relative;
  final int? delay;

  const NumberStat({required this.number, this.count, this.relative, this.delay});

  factory NumberStat.fromJson(Map<String, dynamic> json) => NumberStat(
        number: json['number'] as int,
        count: json['count'] as int?,
        relative: (json['relative'] as num?)?.toDouble(),
        delay: json['delay'] as int?,
      );
}

class StatsResult {
  final int drawCount;
  final String explanation;
  final String disclaimer;
  final List<NumberStat> numbers;
  final List<NumberStat> chance;
  final Map<String, dynamic> raw;

  const StatsResult({
    required this.drawCount,
    required this.explanation,
    required this.disclaimer,
    required this.numbers,
    required this.chance,
    required this.raw,
  });

  factory StatsResult.fromJson(Map<String, dynamic> json) => StatsResult(
        drawCount: (json['draw_count'] ?? 0) as int,
        explanation: (json['explanation'] ?? '') as String,
        disclaimer: (json['disclaimer'] ?? '') as String,
        numbers: ((json['numbers'] ?? []) as List)
            .map((item) => NumberStat.fromJson(item as Map<String, dynamic>))
            .toList(),
        chance: ((json['chance'] ?? []) as List)
            .map((item) => NumberStat.fromJson(item as Map<String, dynamic>))
            .toList(),
        raw: json,
      );
}

class GeneratedGrid {
  final List<int> numbers;
  final int chance;
  final String methodLabel;
  final String warning;

  const GeneratedGrid({
    required this.numbers,
    required this.chance,
    required this.methodLabel,
    required this.warning,
  });

  factory GeneratedGrid.fromJson(Map<String, dynamic> json) => GeneratedGrid(
        numbers: List<int>.from(json['numbers'] as List),
        chance: json['chance'] as int,
        methodLabel: (json['method_label'] ?? '') as String,
        warning: (json['warning'] ?? '') as String,
      );
}

class SavedGrid {
  final int id;
  final String? name;
  final List<int> numbers;
  final int chance;
  final String method;

  const SavedGrid({
    required this.id,
    this.name,
    required this.numbers,
    required this.chance,
    required this.method,
  });

  factory SavedGrid.fromJson(Map<String, dynamic> json) => SavedGrid(
        id: json['id'] as int,
        name: json['name'] as String?,
        numbers: List<int>.from(json['numbers'] as List),
        chance: json['chance'] as int,
        method: (json['method'] ?? 'manual') as String,
      );
}

class AppNotification {
  final int id;
  final String title;
  final String body;
  final String kind;
  final bool read;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.kind,
    required this.read,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as int,
        title: (json['title'] ?? '') as String,
        body: (json['body'] ?? '') as String,
        kind: (json['kind'] ?? 'info') as String,
        read: json['read_at'] != null,
      );
}

/// Levée quand l'API répond 402 : fonctionnalité Premium.
class PremiumRequiredException implements Exception {
  final String message;
  const PremiumRequiredException(this.message);
}

/// Levée quand la requête a échoué mais qu'une copie en cache est disponible.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  const ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}
