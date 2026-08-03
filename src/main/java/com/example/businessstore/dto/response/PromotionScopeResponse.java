package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PromotionScopeType;

import java.util.UUID;

public record PromotionScopeResponse(
        UUID id,
        PromotionScopeType type,
        UUID targetId,
        String targetName) {
}
