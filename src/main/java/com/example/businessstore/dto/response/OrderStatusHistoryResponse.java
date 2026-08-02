package com.example.businessstore.dto.response;

import com.example.businessstore.constant.OrderStatus;

import java.time.Instant;
import java.util.UUID;

public record OrderStatusHistoryResponse(UUID id, UUID orderId, OrderStatus fromStatus, OrderStatus toStatus, UUID changedBy, String changedByName, String note, Instant createdAt) {
}
