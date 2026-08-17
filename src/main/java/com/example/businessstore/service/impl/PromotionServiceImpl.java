package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.dto.request.UpdatePromotionRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.dto.response.PromotionResponse;
import com.example.businessstore.dto.response.PromotionUsageResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.service.PromotionLine;
import com.example.businessstore.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Stable application facade for promotion operations. */
@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {

    private final PromotionDefinitionService definitionService;
    private final PromotionEligibilityService eligibilityService;
    private final PromotionReservationService reservationService;

    @Override
    @Transactional
    public PromotionResponse create(CreatePromotionRequest request) {
        return definitionService.create(request);
    }

    @Override
    @Transactional
    public PromotionResponse update(UUID id, UpdatePromotionRequest request) {
        return definitionService.update(id, request);
    }

    @Override
    @Transactional
    public PromotionResponse updateStatus(UUID id, PromotionStatus status) {
        return definitionService.updateStatus(id, status);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        definitionService.delete(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponse getById(UUID id) {
        return definitionService.getById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PromotionResponse> getAll(
            String code,
            PromotionStatus status,
            LocalDate effectiveFrom,
            LocalDate effectiveTo,
            int page,
            int size) {
        return definitionService.getAll(code, status, effectiveFrom, effectiveTo, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PromotionUsageResponse> getUsages(UUID promotionId, int page, int size) {
        return definitionService.getUsages(promotionId, page, size);
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionCalculationResponse previewCart(UUID userId, String couponCode) {
        return eligibilityService.previewCart(userId, couponCode);
    }

    @Override
    @Transactional
    public PromotionCalculationResponse reserve(
            UUID userId,
            Order order,
            String couponCode,
            BigDecimal subtotal,
            List<PromotionLine> lines) {
        return reservationService.reserve(userId, order, couponCode, subtotal, lines);
    }

    @Override
    @Transactional
    public void consume(Order order) {
        reservationService.consume(order);
    }

    @Override
    @Transactional
    public void release(Order order) {
        reservationService.release(order);
    }

    @Override
    @Transactional
    public void expire(Order order) {
        reservationService.expire(order);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findExpiredReservationOrderIds(Instant now) {
        return reservationService.findExpiredReservationOrderIds(now);
    }

    @Override
    @Transactional
    public int markEndedPromotionsExpired(Instant now) {
        return reservationService.markEndedPromotionsExpired(now);
    }
}
