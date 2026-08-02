package com.example.businessstore.dto.response;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record PaymentResponse(UUID id, UUID orderId, String orderCode, BigDecimal amount, PaymentMethod method, PaymentStatus status, String transactionCode, Instant paidAt, Instant createdAt) {}
