package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record CreateProductVariantRequest(@NotBlank @Size(max = 80) String sku, @NotBlank @Size(max = 180) String name, @NotNull @DecimalMin("0.01") BigDecimal widthCm, @NotNull @DecimalMin("0.01") BigDecimal heightCm, @NotBlank @Size(max = 100) String material, @NotNull @DecimalMin("0.01") BigDecimal price, @NotNull @Min(0) Integer stockQuantity, Boolean available) {}
