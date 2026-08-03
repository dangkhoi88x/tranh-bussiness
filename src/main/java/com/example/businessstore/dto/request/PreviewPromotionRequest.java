package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PreviewPromotionRequest(@NotBlank @Size(max = 60) String couponCode) {
}
