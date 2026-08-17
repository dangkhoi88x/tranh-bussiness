package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionUsageStatus;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.PromotionUsage;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.PromotionLine;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Owns the lifecycle of a quota reservation after promotion eligibility is known. */
@Service
@RequiredArgsConstructor
public class PromotionReservationService {

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final UserRepository userRepository;
    private final PromotionEligibilityService eligibilityService;

    @Value("${app.promotion.reservation-ttl:PT30M}")
    private Duration reservationTtl;

    @Transactional
    public PromotionCalculationResponse reserve(
            UUID userId,
            Order order,
            String couponCode,
            BigDecimal subtotal,
            List<PromotionLine> lines) {
        PromotionUsage existing = usageRepository.findByOrderId(order.getId()).orElse(null);
        if (existing != null) {
            return calculationFromUsage(existing, subtotal);
        }
        Instant now = Instant.now();
        Promotion promotion = eligibilityService.findActivePromotion(couponCode, now);
        PromotionCalculationResponse calculation = eligibilityService.calculate(
                promotion, eligibilityService.money(subtotal), lines, now.plus(reservationTtl));
        if (promotionRepository.reserveQuota(promotion.getId(), now) != 1) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED,
                    "Mã khuyến mãi đã ngừng áp dụng hoặc đã hết lượt.");
        }
        eligibilityService.ensureUserLimit(promotion, userId);

        PromotionUsage usage = new PromotionUsage();
        usage.setPromotion(promotion);
        usage.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED,
                        "Không tìm thấy tài khoản của phiên đăng nhập này.")));
        usage.setOrder(order);
        usage.setCouponCode(promotion.getCode());
        usage.setEligibleSubtotal(calculation.eligibleSubtotal());
        usage.setDiscountAmount(calculation.discountAmount());
        usage.setStatus(PromotionUsageStatus.RESERVED);
        usage.setExpiresAt(calculation.reservationExpiresAt());
        usageRepository.save(usage);
        return calculation;
    }

    @Transactional
    public void consume(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() == PromotionUsageStatus.CONSUMED) {
            return;
        }
        if (usage.getStatus() != PromotionUsageStatus.RESERVED) {
            throw new AppException(ErrorCode.PROMOTION_RESERVATION_EXPIRED,
                    "Lượt giữ mã khuyến mãi không còn hiệu lực.");
        }
        Instant now = Instant.now();
        if (!now.isBefore(usage.getExpiresAt())) {
            throw new AppException(ErrorCode.PROMOTION_RESERVATION_EXPIRED,
                    "Lượt giữ mã khuyến mãi đã hết hạn.");
        }
        requireCounterUpdate(promotionRepository.consumeReservedQuota(usage.getPromotion().getId()));
        usage.setStatus(PromotionUsageStatus.CONSUMED);
        usage.setConsumedAt(now);
    }

    @Transactional
    public void release(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() == PromotionUsageStatus.RELEASED
                || usage.getStatus() == PromotionUsageStatus.EXPIRED) {
            return;
        }
        if (usage.getStatus() == PromotionUsageStatus.RESERVED) {
            requireCounterUpdate(promotionRepository.releaseReservedQuota(usage.getPromotion().getId()));
        } else if (usage.getStatus() == PromotionUsageStatus.CONSUMED) {
            requireCounterUpdate(promotionRepository.releaseConsumedQuota(usage.getPromotion().getId()));
        }
        usage.setStatus(PromotionUsageStatus.RELEASED);
        usage.setReleasedAt(Instant.now());
    }

    @Transactional
    public void expire(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() != PromotionUsageStatus.RESERVED) {
            return;
        }
        requireCounterUpdate(promotionRepository.releaseReservedQuota(usage.getPromotion().getId()));
        usage.setStatus(PromotionUsageStatus.EXPIRED);
        usage.setReleasedAt(Instant.now());
    }

    @Transactional(readOnly = true)
    public List<UUID> findExpiredReservationOrderIds(Instant now) {
        return usageRepository.findTop100ByStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                        PromotionUsageStatus.RESERVED, now)
                .stream().map(usage -> usage.getOrder().getId()).toList();
    }

    @Transactional
    public int markEndedPromotionsExpired(Instant now) {
        return promotionRepository.markEndedPromotionsExpired(now);
    }

    private PromotionCalculationResponse calculationFromUsage(PromotionUsage usage, BigDecimal subtotal) {
        return new PromotionCalculationResponse(usage.getPromotion().getId(), usage.getCouponCode(),
                usage.getPromotion().getType(), eligibilityService.money(subtotal), usage.getEligibleSubtotal(),
                usage.getDiscountAmount(), eligibilityService.money(subtotal.subtract(usage.getDiscountAmount())),
                usage.getExpiresAt());
    }

    private void requireCounterUpdate(int updated) {
        if (updated != 1) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Số lượt của mã khuyến mãi đang bị lệch.");
        }
    }
}
