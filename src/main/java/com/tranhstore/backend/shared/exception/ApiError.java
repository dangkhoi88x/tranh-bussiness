package com.tranhstore.backend.shared.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiError(String code, String path, Map<String, String> fields) {
}
