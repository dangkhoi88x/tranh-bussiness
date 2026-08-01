package com.tranhstore.backend.shared.api;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(String status, T data, String message, Instant timestamp) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("success", data, null, Instant.now());
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>("success", data, message, Instant.now());
    }

    public static <T> ApiResponse<T> error(T data, String message) {
        return new ApiResponse<>("error", data, message, Instant.now());
    }
}
