package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.service.PromotionLine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionServiceImplTest {

    @Mock
    private PromotionDefinitionService definitionService;
    @Mock
    private PromotionEligibilityService eligibilityService;
    @Mock
    private PromotionReservationService reservationService;
    @InjectMocks
    private PromotionServiceImpl promotionService;

    @Test
    void previewCart_delegatesToEligibilityService() {
        UUID userId = UUID.randomUUID();
        PromotionCalculationResponse expected = new PromotionCalculationResponse(
                UUID.randomUUID(), "SAVE10", null, BigDecimal.TEN, BigDecimal.TEN,
                BigDecimal.ONE, new BigDecimal("9"), null);
        when(eligibilityService.previewCart(userId, "save10")).thenReturn(expected);

        PromotionCalculationResponse result = promotionService.previewCart(userId, "save10");

        assertThat(result).isSameAs(expected);
        verify(eligibilityService).previewCart(userId, "save10");
    }

    @Test
    void reserve_delegatesToReservationService() {
        UUID userId = UUID.randomUUID();
        Order order = new Order();
        List<PromotionLine> lines = List.of(new PromotionLine(UUID.randomUUID(), UUID.randomUUID(), null, BigDecimal.TEN));
        PromotionCalculationResponse expected = new PromotionCalculationResponse(
                UUID.randomUUID(), "SAVE10", null, BigDecimal.TEN, BigDecimal.TEN,
                BigDecimal.ONE, new BigDecimal("9"), null);
        when(reservationService.reserve(userId, order, "SAVE10", BigDecimal.TEN, lines)).thenReturn(expected);

        PromotionCalculationResponse result = promotionService.reserve(userId, order, "SAVE10", BigDecimal.TEN, lines);

        assertThat(result).isSameAs(expected);
        verify(reservationService).reserve(userId, order, "SAVE10", BigDecimal.TEN, lines);
    }

    @Test
    void expire_delegatesToReservationService() {
        Order order = new Order();

        promotionService.expire(order);

        verify(reservationService).expire(order);
    }
}
