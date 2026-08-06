package com.example.businessstore.dto.request;

import com.example.businessstore.constant.ProductStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProductRequest(
        @NotNull UUID categoryId,
        @NotBlank @Size(max = 180) String name,
        @Size(max = 10_000) String description,
        @NotNull @DecimalMin(value = "0.01") BigDecimal price,
        @DecimalMin(value = "0.01") BigDecimal widthCm,
        @DecimalMin(value = "0.01") BigDecimal heightCm,
        @NotNull @Min(0) Integer stockQuantity,
        ProductStatus status,
        @Min(1) Integer pageCount,
        @Size(max = 120) String coverMaterial) {
}
