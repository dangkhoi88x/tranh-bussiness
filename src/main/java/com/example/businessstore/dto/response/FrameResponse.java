package com.example.businessstore.dto.response;

import com.example.businessstore.constant.FrameStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record FrameResponse(
        UUID id,
        String name,
        String slug,
        String material,
        String color,
        BigDecimal widthMm,
        BigDecimal priceAdjustment,
        String description,
        String imageUrl,
        FrameStatus status,
        Instant createdAt,
        Instant updatedAt) {
}
