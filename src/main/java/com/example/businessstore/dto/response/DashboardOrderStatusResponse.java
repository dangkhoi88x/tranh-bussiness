package com.example.businessstore.dto.response;

import com.example.businessstore.constant.OrderStatus;

public record DashboardOrderStatusResponse(OrderStatus status, long count) {
}
