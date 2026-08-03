package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.dto.response.NotificationResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.entity.Notification;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.NotificationRepository;
import com.example.businessstore.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final int MAX_PAGE_SIZE = 100;

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMine(UUID userId, int page, int size) {
        Page<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageRequest(page, size));
        return new PageResponse<>(notifications.getContent().stream().map(this::toResponse).toList(),
                Math.max(page, 1), notifications.getSize(), notifications.getTotalElements(),
                notifications.getTotalPages(), notifications.hasNext());
    }

    @Override
    @Transactional
    public NotificationResponse markRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND, "Notification not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
        }
        return toResponse(notification);
    }

    @Override
    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId, Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean createIfAbsent(
            UUID userId,
            NotificationType type,
            String title,
            String message,
            String actionUrl,
            String eventKey) {
        return notificationRepository.insertIfAbsent(UUID.randomUUID(), userId, type.name(), title, message, actionUrl, eventKey) == 1;
    }

    private Pageable pageRequest(int page, int size) {
        return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getType(), notification.getTitle(),
                notification.getMessage(), notification.getActionUrl(), notification.getReadAt() != null,
                notification.getReadAt(), notification.getCreatedAt());
    }
}
