package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Size;

public record UpdateCategoryRequest(
        @Size(min = 1, max = 100) String name,
        @Size(max = 2_000) String description) {
}
