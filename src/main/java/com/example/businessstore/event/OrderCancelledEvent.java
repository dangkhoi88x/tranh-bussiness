package com.example.businessstore.event;

import java.util.UUID;

/**
 * Đơn bị huỷ, do khách tự huỷ hoặc do nhân viên huỷ. Tồn kho đã hoàn, COD đang chờ đã huỷ và
 * coupon (nếu có) đã được trả lại quota.
 */
public record OrderCancelledEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode) {
}
