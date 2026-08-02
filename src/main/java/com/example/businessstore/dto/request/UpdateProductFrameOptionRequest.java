package com.example.businessstore.dto.request;

import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateProductFrameOptionRequest(
        @DecimalMin(value = "0.00") BigDecimal priceAdjustment,
        Boolean available) {
}
