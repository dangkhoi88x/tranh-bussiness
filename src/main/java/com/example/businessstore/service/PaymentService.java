package com.example.businessstore.service;
import com.example.businessstore.dto.request.CreatePaymentRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentResponse;
import java.util.UUID;
public interface PaymentService {
    PaymentResponse create(UUID userId, UUID orderId, CreatePaymentRequest request);
    PageResponse<PaymentResponse> getMine(UUID userId, int page, int size);
    PaymentResponse getMineById(UUID userId, UUID paymentId);
    PageResponse<PaymentResponse> getAll(int page, int size);
    PaymentResponse confirmCod(UUID changedBy, UUID paymentId);
}
