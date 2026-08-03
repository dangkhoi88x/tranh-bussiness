package com.example.businessstore.dto.request;

import com.example.businessstore.constant.PromotionScopeType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PromotionScopeRequest(
        @NotNull PromotionScopeType type,
        @NotNull UUID targetId) {
}
