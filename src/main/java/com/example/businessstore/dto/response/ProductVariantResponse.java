package com.example.businessstore.dto.response;
import java.math.BigDecimal;
import java.util.UUID;
public record ProductVariantResponse(UUID id, UUID productId, String sku, String name, BigDecimal widthCm, BigDecimal heightCm, String material, BigDecimal price, int stockQuantity, boolean available) {}
