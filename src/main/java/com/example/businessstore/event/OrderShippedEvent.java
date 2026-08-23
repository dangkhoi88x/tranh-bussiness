package com.example.businessstore.event;

import java.util.UUID;

/** Kiện hàng đã được bàn giao cho đơn vị vận chuyển (IN_TRANSIT). */
public record OrderShippedEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode,
        String carrier,
        String trackingCode) {
}
