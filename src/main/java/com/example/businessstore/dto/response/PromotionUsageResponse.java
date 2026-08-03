package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PromotionUsageStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PromotionUsageResponse(
        UUID id,
        UUID promotionId,
        UUID userId,
        UUID orderId,
        String orderCode,
        String couponCode,
        BigDecimal eligibleSubtotal,
        BigDecimal discountAmount,
        PromotionUsageStatus status,
        Instant expiresAt,
        Instant consumedAt,
        Instant releasedAt,
        Instant createdAt) {
}
