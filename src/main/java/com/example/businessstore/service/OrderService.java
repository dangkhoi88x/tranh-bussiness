package com.example.businessstore.service;
import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.dto.request.CheckoutOrderRequest;
import com.example.businessstore.dto.response.OrderResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.OrderStatusHistoryResponse;
import com.example.businessstore.entity.CustomOrderRequest;
import java.util.UUID;
import java.util.List;
public interface OrderService {
    OrderResponse checkout(UUID userId, CheckoutOrderRequest request);
    PageResponse<OrderResponse> getMine(UUID userId, int page, int size);
    OrderResponse getMineById(UUID userId, UUID orderId);
    PageResponse<OrderResponse> getAll(int page, int size);
    OrderResponse getForManagement(UUID orderId);
    OrderResponse updateStatus(UUID changedBy, UUID orderId, OrderStatus status, String note);
    OrderResponse cancel(UUID userId, UUID orderId);
    OrderResponse createFromCustomRequest(UUID userId, UUID shippingAddressId, CustomOrderRequest request);
    List<OrderStatusHistoryResponse> getMineHistory(UUID userId, UUID orderId);
    List<OrderStatusHistoryResponse> getHistoryForManagement(UUID orderId);
    void expirePromotionReservation(UUID orderId);
}
