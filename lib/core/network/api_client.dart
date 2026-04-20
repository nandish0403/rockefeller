import 'package:dio/dio.dart';
import 'package:logger/logger.dart';
import 'backend_endpoints.dart';
import '../storage/secure_storage.dart';
import '../error/app_exception.dart';

final _log = Logger(printer: PrettyPrinter(methodCount: 0, noBoxingByDefault: true));

class ApiClient {
  late final Dio _dio;

  ApiClient({String? baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      _AuthInterceptor(),
      _LoggingInterceptor(),
      _ErrorInterceptor(),
    ]);
  }

  Dio get dio => _dio;

  // ── Convenience methods ───────────────────────────────────────────────

  Future<dynamic> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<dynamic> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    try {
      final response = await _dio.post(path, data: data, queryParameters: queryParameters);
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<dynamic> patch(String path, {dynamic data}) async {
    try {
      final response = await _dio.patch(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  Future<dynamic> postFormData(String path, FormData formData) async {
    try {
      final response = await _dio.post(path, data: formData,
        options: Options(headers: {'Content-Type': 'multipart/form-data'}),
      );
      return response.data;
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  AppException _mapDioError(DioException e) {
    if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
      return UnauthorizedException(
        message: _extractDetail(e.response?.data) ?? 'Unauthorized access',
      );
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.connectionError) {
      return NetworkException(message: 'No network connection. Please check your connection.');
    }
    final detail = _extractDetail(e.response?.data);
    return ApiException(
      message: detail ?? e.message ?? 'An unexpected error occurred',
      statusCode: e.response?.statusCode,
    );
  }

  String? _extractDetail(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['detail']?.toString() ?? data['message']?.toString();
    }
    if (data is String) return data;
    return null;
  }
}

// ── Auth Interceptor ────────────────────────────────────────────────────
class _AuthInterceptor extends Interceptor {
  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await SecureStorage.readToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      await SecureStorage.deleteToken();
    }
    handler.next(err);
  }
}

// ── Logging Interceptor ────────────────────────────────────────────────
class _LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _log.d('[${options.method}] ${options.uri}');
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    _log.d('[${response.statusCode}] ${response.requestOptions.uri}');
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _log.e('[ERROR] ${err.requestOptions.uri}: ${err.message}');
    handler.next(err);
  }
}

// ── Error Interceptor ────────────────────────────────────────────────────
class _ErrorInterceptor extends Interceptor {
  static const int _maxRetries = 2;

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final retryCount = err.requestOptions.extra['retry'] as int? ?? 0;

    if (_shouldRetry(err) && retryCount < _maxRetries) {
      err.requestOptions.extra['retry'] = retryCount + 1;
      await Future.delayed(Duration(seconds: (retryCount + 1) * 2));
      try {
        final response = await Dio().fetch(err.requestOptions);
        handler.resolve(response);
        return;
      } catch (_) {}
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        (err.response?.statusCode != null &&
         err.response!.statusCode! >= 500);
  }
}
