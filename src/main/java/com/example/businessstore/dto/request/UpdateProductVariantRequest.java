package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;
public record UpdateProductVariantRequest(@Size(min = 1, max = 80) String sku, @Size(min = 1, max = 180) String name, @DecimalMin("0.01") BigDecimal widthCm, @DecimalMin("0.01") BigDecimal heightCm, UUID artSizeId, UUID materialId, @DecimalMin("0.01") BigDecimal price, @Min(0) Integer stockQuantity, Boolean available) {}
