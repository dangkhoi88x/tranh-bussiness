package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.event.CustomOrderQuotedEvent;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.event.OrderPlacedEvent;
import com.example.businessstore.event.OrderShippedEvent;
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

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock private NotificationService notificationService;
    @Mock private MailService mailService;
    @Mock private AdminOrderNotificationPublisher adminOrderNotificationPublisher;
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
                eq("/don-hang-cua-toi/" + orderId), eq("ORDER_CONFIRMED:" + orderId))).thenReturn(false);

        listener.onOrderConfirmed(new OrderConfirmedEvent(
                userId, "an@example.com", "An", orderId, "ART-001", BigDecimal.TEN));

        verify(mailService, never()).sendOrderConfirmedEmail(anyString(), anyString(), anyString(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void orderPlaced_sendsReceiptEmailAfterCreatingNotification() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.ORDER_PLACED), anyString(), anyString(),
                eq("/don-hang-cua-toi/" + orderId), eq("ORDER_PLACED:" + orderId))).thenReturn(true);

        listener.onOrderPlaced(new OrderPlacedEvent(userId, "an@example.com", "An", orderId, "ART-001", BigDecimal.TEN));

        verify(mailService).sendOrderPlacedEmail("an@example.com", "An", "ART-001", BigDecimal.TEN);
    }

    @Test
    void notificationFailure_doesNotEscapeAfterCommitAndStillAttemptsAdminAlert() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        OrderPlacedEvent event = new OrderPlacedEvent(
                userId, "an@example.com", "An", orderId, "ART-001", BigDecimal.TEN);
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.ORDER_PLACED), anyString(), anyString(),
                eq("/don-hang-cua-toi/" + orderId), eq("ORDER_PLACED:" + orderId)))
                .thenThrow(new IllegalStateException("notification database unavailable"));

        assertThatCode(() -> listener.onOrderPlaced(event)).doesNotThrowAnyException();

        verify(mailService, never()).sendOrderPlacedEmail(anyString(), anyString(), anyString(),
                org.mockito.ArgumentMatchers.any());
        verify(adminOrderNotificationPublisher).publish(event);
    }

    @Test
    void adminAlertFailure_doesNotEscapeAfterCommit() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        OrderPlacedEvent event = new OrderPlacedEvent(
                userId, "an@example.com", "An", orderId, "ART-001", BigDecimal.TEN);
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.ORDER_PLACED), anyString(), anyString(),
                eq("/don-hang-cua-toi/" + orderId), eq("ORDER_PLACED:" + orderId))).thenReturn(false);
        org.mockito.Mockito.doThrow(new IllegalStateException("redis unavailable"))
                .when(adminOrderNotificationPublisher).publish(event);

        assertThatCode(() -> listener.onOrderPlaced(event)).doesNotThrowAnyException();
    }

    @Test
    void orderShipped_sendsTrackingEmailAfterCreatingNotification() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.ORDER_SHIPPED), anyString(), anyString(),
                eq("/don-hang-cua-toi/" + orderId), eq("ORDER_SHIPPED:" + orderId))).thenReturn(true);

        listener.onOrderShipped(new OrderShippedEvent(userId, "an@example.com", "An", orderId, "ART-001", "GHN", "GHN-001"));

        verify(mailService).sendOrderShippedEmail("an@example.com", "An", "ART-001", "GHN", "GHN-001");
    }

    @Test
    void customOrderQuoted_sendsQuoteEmailAfterCreatingNotification() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        when(notificationService.createIfAbsent(eq(userId), eq(NotificationType.CUSTOM_ORDER_QUOTED), anyString(), anyString(),
                eq("/dat-in"), eq("CUSTOM_ORDER_QUOTED:" + requestId))).thenReturn(true);

        listener.onCustomOrderQuoted(new CustomOrderQuotedEvent(userId, "an@example.com", "An", requestId, "REQ-001", BigDecimal.TEN, "Khung gỗ"));

        verify(mailService).sendCustomOrderQuoteEmail("an@example.com", "An", "REQ-001", BigDecimal.TEN, "Khung gỗ");
    }
}
