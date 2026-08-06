package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;
public record CreateProductVariantRequest(@NotBlank @Size(max = 80) String sku, @NotBlank @Size(max = 180) String name, @NotNull @DecimalMin("0.01") BigDecimal widthCm, @NotNull @DecimalMin("0.01") BigDecimal heightCm, @NotNull UUID artSizeId, @NotNull UUID materialId, @NotNull @DecimalMin("0.01") BigDecimal price, @NotNull @Min(0) Integer stockQuantity, Boolean available) {}
