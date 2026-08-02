package com.example.businessstore.dto.request;

import com.example.businessstore.constant.FrameStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateFrameRequest(
        @Size(min = 1, max = 120) String name,
        @Size(min = 1, max = 80) String material,
        @Size(min = 1, max = 80) String color,
        @DecimalMin(value = "0.01") BigDecimal widthMm,
        @DecimalMin(value = "0.00") BigDecimal priceAdjustment,
        @Size(max = 2_000) String description,
        FrameStatus status) {
}
