package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PromotionResponse(
        UUID id,
        String name,
        String code,
        String description,
        PromotionType type,
        BigDecimal discountValue,
        BigDecimal maxDiscountAmount,
        BigDecimal minOrderAmount,
        Instant startAt,
        Instant endAt,
        int usageLimit,
        int reservedCount,
        int usedCount,
        int perUserLimit,
        boolean appliesToAll,
        PromotionStatus status,
        List<PromotionScopeResponse> scopes,
        Instant createdAt,
        Instant updatedAt) {
}
