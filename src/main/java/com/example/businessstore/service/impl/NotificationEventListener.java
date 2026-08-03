package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.event.UserRegisteredEvent;
import com.example.businessstore.service.MailService;
import com.example.businessstore.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final MailService mailService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserRegistered(UserRegisteredEvent event) {
        boolean created = notificationService.createIfAbsent(
                event.userId(), NotificationType.WELCOME,
                "Chào mừng bạn đến với Business Store",
                "Chào " + event.firstName() + ", tài khoản của bạn đã sẵn sàng để khám phá các tác phẩm nghệ thuật.",
                "/", "WELCOME:" + event.userId());
        if (created) {
            sendWelcomeEmail(event);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        boolean created = notificationService.createIfAbsent(
                event.userId(), NotificationType.ORDER_CONFIRMED,
                "Đơn hàng " + event.orderCode() + " đã được xác nhận",
                "Đơn hàng " + event.orderCode() + " đã được xác nhận và sẽ được chuẩn bị để giao cho bạn.",
                "/orders/" + event.orderId(), "ORDER_CONFIRMED:" + event.orderId());
        if (created) {
            sendOrderConfirmedEmail(event);
        }
    }

    private void sendWelcomeEmail(UserRegisteredEvent event) {
        try {
            mailService.sendWelcomeEmail(event.email(), event.firstName());
        } catch (RuntimeException exception) {
            log.warn("Welcome email failed for user {}", event.userId(), exception);
        }
    }

    private void sendOrderConfirmedEmail(OrderConfirmedEvent event) {
        try {
            mailService.sendOrderConfirmedEmail(event.email(), event.firstName(), event.orderCode(), event.totalAmount());
        } catch (RuntimeException exception) {
            log.warn("Order-confirmed email failed for order {}", event.orderId(), exception);
        }
    }
}
