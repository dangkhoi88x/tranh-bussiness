package com.example.businessstore.dto.response;

import java.time.Instant;
import java.util.UUID;

public record WishlistItemResponse(
        UUID id,
        ProductResponse product,
        ProductVariantResponse selectedVariant,
        String primaryImageUrl,
        Instant createdAt) {
}
