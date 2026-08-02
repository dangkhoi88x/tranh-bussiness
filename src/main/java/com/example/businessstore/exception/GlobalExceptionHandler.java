package com.example.businessstore.exception;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleAppException(AppException exception, HttpServletRequest request) {
        return error(exception.getErrorCode(), exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleValidation(
            MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return error(ErrorCode.VALIDATION_ERROR, "Request validation failed", request, fields);
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiResponse<ApiError>> handleBadRequest(Exception exception, HttpServletRequest request) {
        return error(ErrorCode.INVALID_REQUEST, "Invalid request", request, Map.of());
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<ApiError>> handleAuthenticationException(
            AuthenticationException exception,
            HttpServletRequest request) {
        return error(ErrorCode.INVALID_CREDENTIALS, "Invalid email or password", request, Map.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<ApiError>> handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception for {}", request.getRequestURI(), exception);
        return error(ErrorCode.INTERNAL_ERROR, "An unexpected error occurred", request, Map.of());
    }

    private ResponseEntity<ApiResponse<ApiError>> error(
            ErrorCode errorCode,
            String message,
            HttpServletRequest request,
            Map<String, String> fields) {
        ApiError apiError = new ApiError(errorCode.value(), request.getRequestURI(), fields);
        return ResponseEntity.status(errorCode.httpStatus())
                .body(ApiResponse.error(apiError, message));
    }
}
