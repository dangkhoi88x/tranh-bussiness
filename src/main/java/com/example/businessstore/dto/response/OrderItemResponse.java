package com.example.businessstore.dto.response;
import java.math.BigDecimal;
import java.util.UUID;
public record OrderItemResponse(UUID id, UUID productId, String productName, String productSlug, UUID productVariantId, String variantSku, String variantName, String variantMaterial, BigDecimal variantWidthCm, BigDecimal variantHeightCm, UUID productFrameOptionId, String frameName, BigDecimal productPrice, BigDecimal framePriceAdjustment, BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {}
