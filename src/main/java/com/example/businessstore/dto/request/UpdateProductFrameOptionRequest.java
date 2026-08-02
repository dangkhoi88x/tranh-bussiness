package com.example.businessstore.dto.request;

import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateProductFrameOptionRequest(
        @DecimalMin(value = "0.00") BigDecimal priceAdjustment,
        @DecimalMin(value = "0.01") BigDecimal minWidthCm,
        @DecimalMin(value = "0.01") BigDecimal maxWidthCm,
        @DecimalMin(value = "0.01") BigDecimal minHeightCm,
        @DecimalMin(value = "0.01") BigDecimal maxHeightCm,
        Boolean available) {
}
