package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.AdminNewOrderNotificationResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisAdminOrderNotificationSubscriber implements MessageListener {

    private final ObjectMapper objectMapper;
    private final AdminOrderNotificationStreamService streamService;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String body = new String(message.getBody(), StandardCharsets.UTF_8);
            streamService.broadcast(objectMapper.readValue(body, AdminNewOrderNotificationResponse.class));
        } catch (RuntimeException exception) {
            log.warn("Could not process Redis new-order notification", exception);
        }
    }
}
