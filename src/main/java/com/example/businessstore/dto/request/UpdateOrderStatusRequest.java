package com.example.businessstore.dto.request;
import com.example.businessstore.constant.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public record UpdateOrderStatusRequest(@NotNull OrderStatus status, @Size(max = 4000) String note) {}
