package com.example.businessstore.event;

import java.util.UUID;

/**
 * Giao hàng thất bại: hàng đã hoàn về kho, COD đang chờ đã bị huỷ (Order DELIVERY_FAILED).
 * Đây là sự kiện khách cần biết nhất trong nhóm này — trước đây họ không nhận được thông báo nào.
 */
public record OrderDeliveryFailedEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode,
        String failureReason) {
}
