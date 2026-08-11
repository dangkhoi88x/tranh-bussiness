package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Lightweight payload sent to order-management screens when an order is created. */
public record AdminNewOrderNotificationResponse(
        UUID orderId,
        String orderCode,
        BigDecimal totalAmount,
        Instant createdAt) {
}
