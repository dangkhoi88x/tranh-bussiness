package com.example.businessstore.event;

import java.math.BigDecimal;
import java.util.UUID;

/** Xưởng đã gửi báo giá cho yêu cầu in theo yêu cầu. */
public record CustomOrderQuotedEvent(
        UUID userId,
        String email,
        String firstName,
        UUID requestId,
        String requestCode,
        BigDecimal quotedPrice,
        String staffNote) {
}
