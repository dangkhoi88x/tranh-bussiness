package com.example.businessstore.dto.response;
import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.constant.ShipmentStatus;
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
        BigDecimal shippingFee,
        BigDecimal totalAmount,
        PaymentStatus paymentStatus,
        PaymentMethod paymentMethod,
        ShipmentStatus shipmentStatus,
        RefundStatus refundStatus,
        BigDecimal refundAmount,
        UUID promotionId,
        String promotionCode,
        OrderCustomDetailsResponse customDetails,
        List<OrderItemResponse> items,
        Instant createdAt) {
}
