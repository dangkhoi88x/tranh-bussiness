package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AddCartItemRequest(
        @NotNull UUID productId,
        UUID productVariantId,
        UUID productFrameOptionId,
        @NotNull @Min(1) @Max(999) Integer quantity) {
}
