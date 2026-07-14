import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/models.dart';
import 'config.dart';

/// Client API typé avec :
///  * injection automatique du jeton Supabase ;
///  * mapping homogène des erreurs ({"error": {code, message}}) ;
///  * cache local des GET pour le mode dégradé hors connexion.
class ApiClient {
  ApiClient({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: AppConfig.apiBaseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 20),
            ));

  final Dio _dio;
  bool lastResponseFromCache = false;

  String? get _accessToken {
    if (!AppConfig.supabaseConfigured) return null;
    return Supabase.instance.client.auth.currentSession?.accessToken;
  }

  Options get _options {
    final token = _accessToken;
    return Options(headers: token == null ? {} : {'Authorization': 'Bearer $token'});
  }

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? query,
    bool cacheable = true,
  }) async {
    lastResponseFromCache = false;
    final cacheKey = 'api-cache:$path:${jsonEncode(query ?? {})}';
    try {
      final response =
          await _dio.get<Map<String, dynamic>>(path, queryParameters: query, options: _options);
      final data = response.data ?? {};
      if (cacheable) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(cacheKey, jsonEncode(data));
      }
      return data;
    } on DioException catch (error) {
      final mapped = _mapError(error);
      if (cacheable && _isNetworkIssue(error)) {
        final prefs = await SharedPreferences.getInstance();
        final cached = prefs.getString(cacheKey);
        if (cached != null) {
          lastResponseFromCache = true;
          return jsonDecode(cached) as Map<String, dynamic>;
        }
      }
      throw mapped;
    }
  }

  Future<List<dynamic>> getJsonList(String path, {Map<String, dynamic>? query}) async {
    try {
      final response = await _dio.get<List<dynamic>>(path, queryParameters: query, options: _options);
      return response.data ?? [];
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(path, data: body, options: _options);
      return response.data ?? {};
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<Map<String, dynamic>> putJson(String path, Map<String, dynamic> body) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(path, data: body, options: _options);
      return response.data ?? {};
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<void> delete(String path, {Map<String, dynamic>? body}) async {
    try {
      await _dio.delete<void>(path, data: body, options: _options);
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  bool _isNetworkIssue(DioException error) =>
      error.type == DioExceptionType.connectionError ||
      error.type == DioExceptionType.connectionTimeout ||
      error.type == DioExceptionType.receiveTimeout;

  Exception _mapError(DioException error) {
    final status = error.response?.statusCode;
    String message = 'Le service est momentanément indisponible.';
    final data = error.response?.data;
    if (data is Map && data['error'] is Map) {
      message = (data['error']['message'] ?? message) as String;
    } else if (_isNetworkIssue(error)) {
      message = 'Connexion impossible. Vérifiez votre réseau.';
    }
    if (status == 402) return PremiumRequiredException(message);
    return ApiException(message, statusCode: status);
  }
}
