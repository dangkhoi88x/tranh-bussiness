package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.entity.Notification;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock private NotificationRepository notificationRepository;
    @InjectMocks private NotificationServiceImpl notificationService;

    @Test
    void createIfAbsent_usesAtomicRepositoryInsert() {
        UUID userId = UUID.randomUUID();
        when(notificationRepository.insertIfAbsent(any(UUID.class), eq(userId), eq("WELCOME"), eq("Welcome"),
                eq("Message"), eq("/"), eq("WELCOME:" + userId))).thenReturn(1);

        boolean created = notificationService.createIfAbsent(userId, NotificationType.WELCOME,
                "Welcome", "Message", "/", "WELCOME:" + userId);

        assertThat(created).isTrue();
    }

    @Test
    void markRead_onlyReturnsNotificationsOwnedByCurrentUser() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        Notification notification = notification(notificationId, userId);
        when(notificationRepository.findByIdAndUserId(notificationId, userId)).thenReturn(Optional.of(notification));

        var response = notificationService.markRead(userId, notificationId);

        assertThat(response.read()).isTrue();
        assertThat(notification.getReadAt()).isNotNull();
    }

    @Test
    void markRead_hidesNotificationsOwnedByAnotherUser() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationRepository.findByIdAndUserId(notificationId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.markRead(userId, notificationId))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.NOTIFICATION_NOT_FOUND));
    }

    @Test
    void mine_returnsNewestPageFromRepository() {
        UUID userId = UUID.randomUUID();
        Notification notification = notification(UUID.randomUUID(), userId);
        notification.setCreatedAt(Instant.now());
        when(notificationRepository.findAllByUserIdOrderByCreatedAtDesc(eq(userId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(notification)));

        var response = notificationService.getMine(userId, 1, 20);

        assertThat(response.items()).singleElement().satisfies(item -> assertThat(item.id()).isEqualTo(notification.getId()));
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(notificationRepository).findAllByUserIdOrderByCreatedAtDesc(eq(userId), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("createdAt").getDirection().isDescending()).isTrue();
    }

    private Notification notification(UUID id, UUID userId) {
        User user = new User(); user.setId(userId);
        Notification notification = new Notification(); notification.setId(id); notification.setUser(user);
        notification.setType(NotificationType.WELCOME); notification.setTitle("Welcome"); notification.setMessage("Message");
        notification.setEventKey("WELCOME:" + userId);
        return notification;
    }
}
