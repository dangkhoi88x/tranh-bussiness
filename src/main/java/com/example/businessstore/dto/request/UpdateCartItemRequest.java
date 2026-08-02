package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateCartItemRequest(@NotNull @Min(1) @Max(999) Integer quantity) {
}
