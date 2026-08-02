package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record ProductFrameOptionResponse(
        UUID id,
        UUID productId,
        UUID frameId,
        String frameName,
        String frameMaterial,
        String frameColor,
        String frameImageUrl,
        BigDecimal priceAdjustment,
        boolean available) {
}
