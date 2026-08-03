package com.example.businessstore.dto.response;
import com.example.businessstore.constant.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
public record OrderResponse(
        UUID id,
        String orderCode,
        OrderStatus status,
        String shippingAddress,
        OrderShippingAddressResponse shippingAddressSnapshot,
        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        UUID promotionId,
        String promotionCode,
        OrderCustomDetailsResponse customDetails,
        List<OrderItemResponse> items,
        Instant createdAt) {
}
