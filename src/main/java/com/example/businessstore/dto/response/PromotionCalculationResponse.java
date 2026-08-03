package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PromotionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PromotionCalculationResponse(
        UUID promotionId,
        String couponCode,
        PromotionType type,
        BigDecimal subtotalAmount,
        BigDecimal eligibleSubtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        Instant reservationExpiresAt) {
}
