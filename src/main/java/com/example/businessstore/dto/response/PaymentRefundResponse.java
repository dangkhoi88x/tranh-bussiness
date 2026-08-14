package com.example.businessstore.dto.response;

import com.example.businessstore.constant.RefundStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentRefundResponse(
        UUID id,
        UUID orderId,
        String orderCode,
        UUID paymentId,
        String transactionCode,
        BigDecimal amount,
        RefundStatus status,
        String reason,
        String providerRefundId,
        String failureMessage,
        Instant completedAt,
        Instant createdAt) {
}
