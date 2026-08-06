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
        Instant updatedAt,
        int effectiveStockQuantity,
        boolean hasVariants,
        String primaryImageUrl) {

    public ProductResponse(UUID id, UUID categoryId, String categoryName, String name, String slug, String description,
                           BigDecimal price, BigDecimal widthCm, BigDecimal heightCm, int stockQuantity,
                           ProductStatus status, Instant createdAt, Instant updatedAt) {
        this(id, categoryId, categoryName, name, slug, description, price, widthCm, heightCm, stockQuantity,
                status, createdAt, updatedAt, stockQuantity, false, null);
    }

    public ProductResponse withInventory(int effectiveStockQuantity, boolean hasVariants) {
        return new ProductResponse(id, categoryId, categoryName, name, slug, description, price, widthCm, heightCm,
                stockQuantity, status, createdAt, updatedAt, effectiveStockQuantity, hasVariants, primaryImageUrl);
    }

    public ProductResponse addManagementPreview(String primaryImageUrl) {
        return new ProductResponse(id, categoryId, categoryName, name, slug, description, price, widthCm, heightCm,
                stockQuantity, status, createdAt, updatedAt, effectiveStockQuantity, hasVariants, primaryImageUrl);
    }
}
