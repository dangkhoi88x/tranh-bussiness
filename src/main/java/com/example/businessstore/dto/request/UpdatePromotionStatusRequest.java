package com.example.businessstore.dto.request;

import com.example.businessstore.constant.PromotionStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePromotionStatusRequest(@NotNull PromotionStatus status) {
}
