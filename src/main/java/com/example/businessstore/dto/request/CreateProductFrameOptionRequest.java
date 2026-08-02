package com.example.businessstore.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProductFrameOptionRequest(
        @NotNull UUID frameId,
        @DecimalMin(value = "0.00") BigDecimal priceAdjustment,
        Boolean available) {
}
