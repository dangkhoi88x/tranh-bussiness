package com.example.businessstore.service;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.dto.response.OrderStatusHistoryResponse;
import com.example.businessstore.entity.Order;

import java.util.List;
import java.util.UUID;

public interface OrderStatusHistoryService {
    void record(Order order, OrderStatus fromStatus, OrderStatus toStatus, UUID changedBy, String note);
    List<OrderStatusHistoryResponse> getMine(UUID userId, UUID orderId);
    List<OrderStatusHistoryResponse> getForManagement(UUID orderId);
}
