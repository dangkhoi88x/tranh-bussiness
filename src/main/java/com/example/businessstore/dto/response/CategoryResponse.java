package com.example.businessstore.dto.response;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        String slug,
        String description,
        Instant createdAt,
        Instant updatedAt) {
}
