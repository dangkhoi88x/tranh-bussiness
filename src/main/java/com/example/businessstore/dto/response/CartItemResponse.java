package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponse(
        UUID id,
        UUID productId,
        String productName,
        String productSlug,
        ProductVariantResponse selectedVariant,
        BigDecimal basePrice,
        ProductFrameOptionResponse selectedFrameOption,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal) {
}
