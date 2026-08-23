package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionReservationServiceTest {

    @Mock
    private PromotionRepository promotionRepository;
    @Mock
    private PromotionUsageRepository usageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PromotionEligibilityService eligibilityService;
    @InjectMocks
    private PromotionReservationService reservationService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(reservationService, "reservationTtl", Duration.ofMinutes(30));
    }

    @Test
    void reserve_rejectsWhenAtomicQuotaUpdateCannotClaimSlot() {
        UUID userId = UUID.randomUUID();
        Order order = new Order();
        order.setId(UUID.randomUUID());
        Promotion promotion = activePromotion(PromotionType.FIXED_AMOUNT, new BigDecimal("100"));
        PromotionCalculationResponse calculation = new PromotionCalculationResponse(
                promotion.getId(), promotion.getCode(), promotion.getType(), new BigDecimal("1000"),
                new BigDecimal("1000"), new BigDecimal("100"), new BigDecimal("900"), Instant.now().plusSeconds(60));
        when(usageRepository.findByOrderId(order.getId())).thenReturn(Optional.empty());
        when(eligibilityService.findActivePromotion(eq("VARIANT10"), any())).thenReturn(promotion);
        when(eligibilityService.calculate(eq(promotion), any(), any(), any())).thenReturn(calculation);
        when(promotionRepository.reserveQuota(any(), any())).thenReturn(0);

        assertThatThrownBy(() -> reservationService.reserve(userId, order, "VARIANT10",
                new BigDecimal("1000"), List.of(new PromotionLine(
                        UUID.randomUUID(), UUID.randomUUID(), null, new BigDecimal("1000")))))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED);
        verify(usageRepository, never()).save(any());
    }

    @Test
    void consume_movesReservedQuotaAndUsageToConsumed() {
        Order order = new Order();
        order.setId(UUID.randomUUID());
        Promotion promotion = activePromotion(PromotionType.PERCENTAGE, BigDecimal.TEN);
        PromotionUsage usage = new PromotionUsage();
        usage.setPromotion(promotion);
        usage.setOrder(order);
        usage.setStatus(PromotionUsageStatus.RESERVED);
        usage.setExpiresAt(Instant.now().plusSeconds(300));
        when(usageRepository.findByOrderIdForUpdate(order.getId())).thenReturn(Optional.of(usage));
        when(promotionRepository.consumeReservedQuota(promotion.getId())).thenReturn(1);

        reservationService.consume(order);

        assertThat(usage.getStatus()).isEqualTo(PromotionUsageStatus.CONSUMED);
        assertThat(usage.getConsumedAt()).isNotNull();
        verify(promotionRepository).consumeReservedQuota(promotion.getId());
    }

    private Promotion activePromotion(PromotionType type, BigDecimal discountValue) {
        Promotion promotion = new Promotion();
        promotion.setId(UUID.randomUUID());
        promotion.setCode("VARIANT10");
        promotion.setType(type);
        promotion.setDiscountValue(discountValue);
        promotion.setMinOrderAmount(BigDecimal.ZERO);
        promotion.setStartAt(Instant.now().minusSeconds(60));
        promotion.setEndAt(Instant.now().plusSeconds(3600));
        promotion.setUsageLimit(10);
        promotion.setPerUserLimit(1);
        promotion.setStatus(PromotionStatus.ACTIVE);
        promotion.setAppliesToAll(true);
        return promotion;
    }
}
