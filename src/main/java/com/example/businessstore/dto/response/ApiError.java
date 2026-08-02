package com.example.businessstore.dto.response;

import java.util.Map;

public record ApiError(String code, String path, Map<String, String> fields) {
}
