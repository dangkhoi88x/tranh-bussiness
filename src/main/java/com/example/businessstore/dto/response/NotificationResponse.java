package com.example.businessstore.dto.response;

import com.example.businessstore.constant.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        String title,
        String message,
        String actionUrl,
        boolean read,
        Instant readAt,
        Instant createdAt) {
}
