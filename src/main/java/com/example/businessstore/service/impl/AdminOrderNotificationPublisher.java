package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.AdminNewOrderNotificationResponse;
import com.example.businessstore.event.OrderPlacedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;

/** Publishes after-commit order events so every application instance can notify its local SSE clients. */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminOrderNotificationPublisher {

    public static final String CHANNEL = "business-store:admin:new-order";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public void publish(OrderPlacedEvent event) {
        try {
            AdminNewOrderNotificationResponse payload = new AdminNewOrderNotificationResponse(
                    event.orderId(), event.orderCode(), event.totalAmount(), Instant.now());
            redisTemplate.convertAndSend(CHANNEL, objectMapper.writeValueAsString(payload));
        } catch (RuntimeException exception) {
            // A completed checkout must not become an error merely because the live alert transport is unavailable.
            log.warn("Could not publish new-order notification for order {}", event.orderId(), exception);
        }
    }
}
