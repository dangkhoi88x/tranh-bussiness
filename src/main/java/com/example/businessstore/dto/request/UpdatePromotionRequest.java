package com.example.businessstore.dto.request;

import com.example.businessstore.constant.PromotionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record UpdatePromotionRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 60) String code,
        @Size(max = 5000) String description,
        @NotNull PromotionType type,
        @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal discountValue,
        @DecimalMin(value = "0", inclusive = false) BigDecimal maxDiscountAmount,
        @NotNull @DecimalMin("0") BigDecimal minOrderAmount,
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        @Min(0) int usageLimit,
        @Min(0) int perUserLimit,
        List<@Valid PromotionScopeRequest> scopes) {
}
