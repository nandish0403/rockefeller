/// Base exception for all app-level errors
sealed class AppException implements Exception {
  final String message;
  const AppException({required this.message});
  @override
  String toString() => message;
}

class ApiException extends AppException {
  final int? statusCode;
  const ApiException({required super.message, this.statusCode});
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({required super.message});
}

class NetworkException extends AppException {
  const NetworkException({required super.message});
}

class ValidationException extends AppException {
  final Map<String, String>? fields;
  const ValidationException({required super.message, this.fields});
}

class NotFoundException extends AppException {
  const NotFoundException({required super.message});
}
