package com.example.businessstore.event;

import java.util.UUID;

/** Đơn đã giao thành công và khoản COD đã được thu (Order DELIVERED). */
public record OrderDeliveredEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode) {
}
