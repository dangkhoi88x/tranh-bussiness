package com.example.businessstore.service;

import java.math.BigDecimal;
import java.util.UUID;

public record PromotionLine(
        UUID categoryId,
        UUID productId,
        UUID productVariantId,
        BigDecimal eligibleAmount) {
}
