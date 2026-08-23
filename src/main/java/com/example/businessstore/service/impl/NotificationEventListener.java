package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.event.CustomOrderQuotedEvent;
import com.example.businessstore.event.OrderCancelledEvent;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.event.OrderDeliveredEvent;
import com.example.businessstore.event.OrderDeliveryFailedEvent;
import com.example.businessstore.event.OrderPlacedEvent;
import com.example.businessstore.event.OrderShippedEvent;
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
    private final AdminOrderNotificationPublisher adminOrderNotificationPublisher;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserRegistered(UserRegisteredEvent event) {
        runSafely("welcome notification", event.userId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.WELCOME,
                    "Chào mừng bạn đến với Business Store",
                    "Chào " + event.firstName() + ", tài khoản của bạn đã sẵn sàng để khám phá các tác phẩm nghệ thuật.",
                    "/", "WELCOME:" + event.userId());
            if (created) sendWelcomeEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderConfirmed(OrderConfirmedEvent event) {
        runSafely("order-confirmed notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_CONFIRMED,
                    "Đơn hàng " + event.orderCode() + " đã được xác nhận",
                    "Đơn hàng " + event.orderCode() + " đã được xác nhận và sẽ được chuẩn bị để giao cho bạn.",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_CONFIRMED:" + event.orderId());
            if (created) sendOrderConfirmedEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderPlaced(OrderPlacedEvent event) {
        runSafely("order-placed notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_PLACED,
                    "Đã nhận đơn hàng " + event.orderCode(),
                    "Đơn hàng " + event.orderCode() + " đã được tiếp nhận và đang chờ xưởng xác nhận.",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_PLACED:" + event.orderId());
            if (created) sendOrderPlacedEmail(event);
        });
        runSafely("admin new-order notification", event.orderId(),
                () -> adminOrderNotificationPublisher.publish(event));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderShipped(OrderShippedEvent event) {
        runSafely("order-shipped notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_SHIPPED,
                    "Đơn hàng " + event.orderCode() + " đang được giao",
                    "Đơn hàng đã được bàn giao cho " + event.carrier() + ". Mã vận đơn: " + event.trackingCode() + ".",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_SHIPPED:" + event.orderId());
            if (created) sendOrderShippedEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderDelivered(OrderDeliveredEvent event) {
        runSafely("order-delivered notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_DELIVERED,
                    "Đơn hàng " + event.orderCode() + " đã giao thành công",
                    "Đơn hàng " + event.orderCode() + " đã được giao và khoản thanh toán khi nhận hàng đã được ghi nhận.",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_DELIVERED:" + event.orderId());
            if (created) sendOrderDeliveredEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderDeliveryFailed(OrderDeliveryFailedEvent event) {
        runSafely("order-delivery-failed notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_DELIVERY_FAILED,
                    "Giao hàng thất bại cho đơn " + event.orderCode(),
                    "Đơn hàng " + event.orderCode() + " giao không thành công và đã được hoàn về kho. "
                            + "Vui lòng liên hệ xưởng nếu bạn muốn giao lại.",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_DELIVERY_FAILED:" + event.orderId());
            if (created) sendOrderDeliveryFailedEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderCancelled(OrderCancelledEvent event) {
        runSafely("order-cancelled notification", event.orderId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.ORDER_CANCELLED,
                    "Đơn hàng " + event.orderCode() + " đã được huỷ",
                    "Đơn hàng " + event.orderCode() + " đã được huỷ. Khoản thanh toán khi nhận hàng (nếu có) đã huỷ theo.",
                    "/don-hang-cua-toi/" + event.orderId(), "ORDER_CANCELLED:" + event.orderId());
            if (created) sendOrderCancelledEmail(event);
        });
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCustomOrderQuoted(CustomOrderQuotedEvent event) {
        runSafely("custom-order quote notification", event.requestId(), () -> {
            boolean created = notificationService.createIfAbsent(
                    event.userId(), NotificationType.CUSTOM_ORDER_QUOTED,
                    "Đã có báo giá cho yêu cầu " + event.requestCode(),
                    "Xưởng đã hoàn tất báo giá. Vui lòng xem và phản hồi yêu cầu in của bạn.",
                    "/dat-in", "CUSTOM_ORDER_QUOTED:" + event.requestId());
            if (created) sendCustomOrderQuoteEmail(event);
        });
    }

    /** Side effects chạy AFTER_COMMIT không được biến một nghiệp vụ đã lưu thành API thất bại. */
    private void runSafely(String action, Object aggregateId, Runnable operation) {
        try {
            operation.run();
        } catch (RuntimeException exception) {
            log.warn("Could not complete {} for {} after commit", action, aggregateId, exception);
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

    private void sendOrderPlacedEmail(OrderPlacedEvent event) {
        try {
            mailService.sendOrderPlacedEmail(event.email(), event.firstName(), event.orderCode(), event.totalAmount());
        } catch (RuntimeException exception) {
            log.warn("Order-received email failed for order {}", event.orderId(), exception);
        }
    }

    private void sendOrderShippedEmail(OrderShippedEvent event) {
        try {
            mailService.sendOrderShippedEmail(event.email(), event.firstName(), event.orderCode(), event.carrier(), event.trackingCode());
        } catch (RuntimeException exception) {
            log.warn("Order-shipped email failed for order {}", event.orderId(), exception);
        }
    }

    private void sendOrderDeliveredEmail(OrderDeliveredEvent event) {
        try {
            mailService.sendOrderDeliveredEmail(event.email(), event.firstName(), event.orderCode());
        } catch (RuntimeException exception) {
            log.warn("Order-delivered email failed for order {}", event.orderId(), exception);
        }
    }

    private void sendOrderDeliveryFailedEmail(OrderDeliveryFailedEvent event) {
        try {
            mailService.sendOrderDeliveryFailedEmail(event.email(), event.firstName(), event.orderCode(), event.failureReason());
        } catch (RuntimeException exception) {
            log.warn("Order-delivery-failed email failed for order {}", event.orderId(), exception);
        }
    }

    private void sendOrderCancelledEmail(OrderCancelledEvent event) {
        try {
            mailService.sendOrderCancelledEmail(event.email(), event.firstName(), event.orderCode());
        } catch (RuntimeException exception) {
            log.warn("Order-cancelled email failed for order {}", event.orderId(), exception);
        }
    }

    private void sendCustomOrderQuoteEmail(CustomOrderQuotedEvent event) {
        try {
            mailService.sendCustomOrderQuoteEmail(event.email(), event.firstName(), event.requestCode(), event.quotedPrice(), event.staffNote());
        } catch (RuntimeException exception) {
            log.warn("Custom-order quote email failed for request {}", event.requestId(), exception);
        }
    }
}
