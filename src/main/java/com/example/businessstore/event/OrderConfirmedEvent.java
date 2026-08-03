package com.example.businessstore.event;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderConfirmedEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode,
        BigDecimal totalAmount) {
}
