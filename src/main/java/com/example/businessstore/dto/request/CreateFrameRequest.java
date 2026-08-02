package com.example.businessstore.dto.request;

import com.example.businessstore.constant.FrameStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateFrameRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 80) String material,
        @NotBlank @Size(max = 80) String color,
        @NotNull @DecimalMin(value = "0.01") BigDecimal widthMm,
        @NotNull @DecimalMin(value = "0.00") BigDecimal priceAdjustment,
        @Size(max = 2_000) String description,
        FrameStatus status) {
}
