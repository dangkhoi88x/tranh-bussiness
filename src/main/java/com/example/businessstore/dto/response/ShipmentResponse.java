package com.example.businessstore.dto.response;
import com.example.businessstore.constant.ShipmentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
public record ShipmentResponse(UUID id, UUID orderId, String orderCode, String carrier, String trackingCode, BigDecimal shippingFee, ShipmentStatus status, Instant shippedAt, Instant deliveredAt, Instant failedAt, String failureReason) {}
