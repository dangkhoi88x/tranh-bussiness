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
        String categorySlug,
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
        /** True khi sản phẩm bán theo số trang (photobook) — giá lấy từ /photobook-pricing. */
        boolean pagePriced) {

    /** Shape produced by ProductMapper, before the service attaches inventory and media. */
    public ProductResponse(UUID id, UUID categoryId, String categoryName, String categorySlug,
                           String name, String slug, String description,
                           BigDecimal price, BigDecimal widthCm, BigDecimal heightCm, int stockQuantity,
                           ProductStatus status, Integer pageCount, String coverMaterial, String primaryImageUrl,
                           List<ProductImageResponse> images, Instant createdAt, Instant updatedAt) {
        this(id, categoryId, categoryName, categorySlug, name, slug, description, price, widthCm, heightCm, stockQuantity,
                status, pageCount, coverMaterial, primaryImageUrl, images, createdAt, updatedAt, stockQuantity, false, false);
    }

    /** Variant-aware stock: the sum over sellable variants, or the product's own stock when it has none. */
    public ProductResponse withInventory(int effectiveStockQuantity, boolean hasVariants) {
        return new ProductResponse(id, categoryId, categoryName, categorySlug, name, slug, description, price, widthCm, heightCm,
                stockQuantity, status, pageCount, coverMaterial, primaryImageUrl, images, createdAt, updatedAt,
                effectiveStockQuantity, hasVariants, pagePriced);
    }

    /** The ordered gallery plus the URL callers show when they only render one image. */
    public ProductResponse withImages(String primaryImageUrl, List<ProductImageResponse> images) {
        return new ProductResponse(id, categoryId, categoryName, categorySlug, name, slug, description, price, widthCm, heightCm,
                stockQuantity, status, pageCount, coverMaterial, primaryImageUrl, images, createdAt, updatedAt,
                effectiveStockQuantity, hasVariants, pagePriced);
    }

    /** Photobook hay không — suy từ bốn cột giá theo trang trên Product. */
    public ProductResponse withPagePricing(boolean pagePriced) {
        return new ProductResponse(id, categoryId, categoryName, categorySlug, name, slug, description, price, widthCm, heightCm,
                stockQuantity, status, pageCount, coverMaterial, primaryImageUrl, images, createdAt, updatedAt,
                effectiveStockQuantity, hasVariants, pagePriced);
    }
}
