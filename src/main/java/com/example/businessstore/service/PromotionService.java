package com.example.businessstore.service;

import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.dto.request.UpdatePromotionRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.dto.response.PromotionResponse;
import com.example.businessstore.dto.response.PromotionUsageResponse;
import com.example.businessstore.entity.Order;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface PromotionService {
    PromotionResponse create(CreatePromotionRequest request);
    PromotionResponse update(UUID id, UpdatePromotionRequest request);
    PromotionResponse updateStatus(UUID id, PromotionStatus status);
    void delete(UUID id);
    PromotionResponse getById(UUID id);
    PageResponse<PromotionResponse> getAll(String code, PromotionStatus status, LocalDate effectiveFrom, LocalDate effectiveTo, int page, int size);
    PageResponse<PromotionUsageResponse> getUsages(UUID promotionId, int page, int size);
    PromotionCalculationResponse previewCart(UUID userId, String couponCode);
    PromotionCalculationResponse reserve(UUID userId, Order order, String couponCode, BigDecimal subtotal, List<PromotionLine> lines);
    void consume(Order order);
    void release(Order order);
    void expire(Order order);
    List<UUID> findExpiredReservationOrderIds(Instant now);
    int markEndedPromotionsExpired(Instant now);
}
