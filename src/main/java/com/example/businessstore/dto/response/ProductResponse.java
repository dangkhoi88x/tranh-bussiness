package com.example.businessstore.dto.response;

import com.example.businessstore.constant.ProductStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String name,
        String slug,
        String description,
        BigDecimal price,
        BigDecimal widthCm,
        BigDecimal heightCm,
        int stockQuantity,
        ProductStatus status,
        Integer pageCount,
        String coverMaterial,
        String primaryImageUrl,
        List<ProductImageResponse> images,
        Instant createdAt,
        Instant updatedAt) {
}
