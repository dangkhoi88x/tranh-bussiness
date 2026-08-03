package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.event.UserRegisteredEvent;
import com.example.businessstore.service.MailService;
import com.example.businessstore.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock private NotificationService notificationService;
    @Mock private MailService mailService;
    @InjectMocks private NotificationEventListener listener;

    @Test
    void userRegistration_createsOneNotificationThenSendsWelcomeEmail() {
        UUID userId = UUID.randomUUID();
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.WELCOME), anyString(), anyString(),
                eq("/"), eq("WELCOME:" + userId))).thenReturn(true);

        listener.onUserRegistered(new UserRegisteredEvent(userId, "an@example.com", "An"));

        verify(mailService).sendWelcomeEmail("an@example.com", "An");
    }

    @Test
    void duplicateOrderConfirmation_doesNotSendAnotherEmail() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.ORDER_CONFIRMED), anyString(), anyString(),
                eq("/orders/" + orderId), eq("ORDER_CONFIRMED:" + orderId))).thenReturn(false);

        listener.onOrderConfirmed(new OrderConfirmedEvent(
                userId, "an@example.com", "An", orderId, "ART-001", BigDecimal.TEN));

        verify(mailService, never()).sendOrderConfirmedEmail(anyString(), anyString(), anyString(), org.mockito.ArgumentMatchers.any());
    }
}
