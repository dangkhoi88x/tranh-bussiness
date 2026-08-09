package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PhotobookSpreadResponse(
        UUID id,
        int position,
        String layoutCode,
        List<Slot> slots) {

    public record Slot(
            UUID id,
            int slotIndex,
            UUID photoId,
            /** URL đã ký; null nếu ô đang trống. */
            String photoUrl,
            BigDecimal focalX,
            BigDecimal focalY) {
    }
}
