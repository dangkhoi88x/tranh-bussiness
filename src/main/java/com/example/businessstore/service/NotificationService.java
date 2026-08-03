package com.example.businessstore.service;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.dto.response.NotificationResponse;
import com.example.businessstore.dto.response.PageResponse;

import java.util.UUID;

public interface NotificationService {

    PageResponse<NotificationResponse> getMine(UUID userId, int page, int size);

    NotificationResponse markRead(UUID userId, UUID notificationId);

    void markAllRead(UUID userId);

    long unreadCount(UUID userId);

    boolean createIfAbsent(
            UUID userId,
            NotificationType type,
            String title,
            String message,
            String actionUrl,
            String eventKey);
}
