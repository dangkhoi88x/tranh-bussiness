package com.example.businessstore.event;

import java.math.BigDecimal;
import java.util.UUID;

/** Đơn vừa được khách tạo thành công ở checkout hoặc sau khi chấp nhận báo giá. */
public record OrderPlacedEvent(
        UUID userId,
        String email,
        String firstName,
        UUID orderId,
        String orderCode,
        BigDecimal totalAmount) {
}
