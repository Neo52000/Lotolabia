import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lotolab_ia/core/api_client.dart';
import 'package:lotolab_ia/data/models.dart';
import 'package:lotolab_ia/data/providers.dart';
import 'package:lotolab_ia/data/supabase_draws.dart';

// Fixtures de test fictives (mêmes que stats_fallback_test.dart).
const _draws = [
  Draw(id: 1, drawDate: '2020-01-04', numbers: [1, 2, 3, 4, 5], chance: 1, source: 'test'),
  Draw(id: 2, drawDate: '2020-01-06', numbers: [1, 6, 7, 8, 9], chance: 2, source: 'test'),
  Draw(id: 3, drawDate: '2020-01-08', numbers: [1, 2, 10, 20, 30], chance: 1, source: 'test'),
  Draw(id: 4, drawDate: '2020-01-11', numbers: [40, 41, 45, 47, 49], chance: 5, source: 'test'),
];

/// API qui échoue toujours avec l'exception fournie.
class _FailingApi extends ApiClient {
  _FailingApi(this.error);
  final Exception error;

  @override
  Future<Map<String, dynamic>> getJson(String path,
          {Map<String, dynamic>? query, bool cacheable = true}) async =>
      throw error;
}

class _FakeSource implements SupabaseDrawsSource {
  int allDrawsCalls = 0;
  int failuresBeforeSuccess = 0;

  @override
  Future<List<Draw>> allDraws() async {
    allDrawsCalls++;
    if (allDrawsCalls <= failuresBeforeSuccess) throw const ApiException('réseau coupé');
    return _draws;
  }

  @override
  Future<Draw> latestDraw() async => _draws.last;

  @override
  Future<DrawPage> drawsPage(int page, int pageSize) async =>
      DrawPage(items: _draws.reversed.toList(), total: _draws.length, truncated: false);

  @override
  Future<Draw> drawByDate(String date) async => _draws.firstWhere((d) => d.drawDate == date);
}

ProviderContainer _container(Exception apiError, _FakeSource source) => ProviderContainer(
      overrides: [
        apiClientProvider.overrideWithValue(_FailingApi(apiError)),
        supabaseDrawsProvider.overrideWithValue(source),
        supabaseFallbackEnabledProvider.overrideWithValue(true),
      ],
    );

void main() {
  const unreachable = ApiUnreachableException('API absente');

  test('API absente : dernier tirage et synthèse lus depuis Supabase', () async {
    final container = _container(unreachable, _FakeSource());
    addTearDown(container.dispose);

    expect((await container.read(latestDrawProvider.future)).drawDate, '2020-01-11');
    final overview = await container.read(overviewProvider.future);
    expect(overview['draw_count'], 4);
    expect((overview['most_frequent'] as List).first['number'], 1);
    expect((await container.read(frequenciesProvider.future)).numbers, hasLength(49));
    expect((await container.read(numberProfileProvider(1).future))['appearances'], 3);
  });

  test("une vraie erreur de l'API ne bascule pas sur Supabase", () async {
    final source = _FakeSource();
    final container = _container(const ApiException('introuvable', statusCode: 404), source);
    addTearDown(container.dispose);

    await expectLater(container.read(overviewProvider.future), throwsA(isA<ApiException>()));
    expect(source.allDrawsCalls, 0);
  });

  test('après un échec de chargement, « Réessayer » relance réellement Supabase', () async {
    final source = _FakeSource()..failuresBeforeSuccess = 1;
    final container = _container(unreachable, source);
    addTearDown(container.dispose);

    await expectLater(container.read(frequenciesProvider.future), throwsA(isA<ApiException>()));
    container.invalidate(frequenciesProvider);
    expect((await container.read(frequenciesProvider.future)).drawCount, 4);
    expect(source.allDrawsCalls, 2);
  });

  test('Supabase non configuré : l\'erreur de l\'API est remontée telle quelle', () async {
    final container = ProviderContainer(overrides: [
      apiClientProvider.overrideWithValue(_FailingApi(unreachable)),
      supabaseDrawsProvider.overrideWithValue(_FakeSource()),
      supabaseFallbackEnabledProvider.overrideWithValue(false),
    ]);
    addTearDown(container.dispose);

    await expectLater(
      container.read(latestDrawProvider.future),
      throwsA(isA<ApiUnreachableException>()),
    );
  });
}
