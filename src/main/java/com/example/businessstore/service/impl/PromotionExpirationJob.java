package com.example.businessstore.service.impl;

import com.example.businessstore.service.OrderService;
import com.example.businessstore.service.PromotionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PromotionExpirationJob {
    private final PromotionService promotionService;
    private final OrderService orderService;

    @Scheduled(fixedDelayString = "${app.promotion.expiry-scan-ms:60000}")
    public void expireReservationsAndCampaigns() {
        Instant now = Instant.now();
        promotionService.markEndedPromotionsExpired(now);
        for (UUID orderId : promotionService.findExpiredReservationOrderIds(now)) {
            try {
                orderService.expirePromotionReservation(orderId);
            } catch (RuntimeException exception) {
                log.error("Failed to expire promotion reservation for order {}", orderId, exception);
            }
        }
    }
}
