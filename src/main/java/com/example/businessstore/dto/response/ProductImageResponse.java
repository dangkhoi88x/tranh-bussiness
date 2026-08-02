package com.example.businessstore.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ProductImageResponse(
        UUID id,
        UUID productId,
        String secureUrl,
        String altText,
        int sortOrder,
        boolean primaryImage,
        Instant createdAt) {
}
