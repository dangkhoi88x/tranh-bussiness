package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

/** A purchasable inventory line; variant fields are null for products without variants. */
public record DashboardLowStockItemResponse(
        UUID productId,
        String productName,
        String categoryName,
        UUID variantId,
        String variantSku,
        String variantName,
        String material,
        BigDecimal widthCm,
        BigDecimal heightCm,
        int stockQuantity) {
}
