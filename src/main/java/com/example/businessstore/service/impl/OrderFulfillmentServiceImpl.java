package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.constant.ShipmentStatus;
import com.example.businessstore.dto.request.CompleteDeliveryRequest;
import com.example.businessstore.dto.request.DeliveryFailureRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.PaymentRefund;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.Shipment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRefundRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.ShipmentRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.OrderFulfillmentService;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderFulfillmentServiceImpl implements OrderFulfillmentService {

    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentRefundRepository paymentRefundRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final PromotionService promotionService;
    private final OrderStatusHistoryService orderStatusHistoryService;

    @Override
    @Transactional
    public void completeDelivery(UUID changedBy, UUID orderId, CompleteDeliveryRequest request) {
        Order order = lockedOrder(orderId);
        Shipment shipment = lockedShipment(orderId);
        requireInTransit(order, shipment, ErrorCode.ORDER_NOT_READY_FOR_COMPLETION);
        Payment payment = paymentRepository.findFirstByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Đơn hàng này chưa có thanh toán nào."));
        if (payment.getMethod() != PaymentMethod.COD || payment.getStatus() != PaymentStatus.PENDING) {
            throw new AppException(ErrorCode.PAYMENT_CANNOT_BE_COMPLETED,
                    "Đơn phải có khoản COD đang chờ thu thì mới hoàn tất giao hàng được.");
        }

        Instant now = Instant.now();
        shipment.setStatus(ShipmentStatus.DELIVERED);
        shipment.setDeliveredAt(now);
        shipment.setFailureReason(null);
        payment.setStatus(PaymentStatus.SUCCESS);
        payment.setPaidAt(now);
        changeOrderStatus(order, OrderStatus.DELIVERED, changedBy,
                append(request.note(), "Shipment delivered; COD payment collected"));
    }

    @Override
    @Transactional
    public void failDelivery(UUID changedBy, UUID orderId, DeliveryFailureRequest request) {
        Order order = lockedOrder(orderId);
        Shipment shipment = lockedShipment(orderId);
        requireInTransit(order, shipment, ErrorCode.ORDER_NOT_READY_FOR_DELIVERY_FAILURE);
        Payment payment = paymentRepository.findFirstByOrderIdForUpdate(orderId).orElse(null);

        Instant now = Instant.now();
        shipment.setStatus(ShipmentStatus.DELIVERY_FAILED);
        shipment.setFailedAt(now);
        shipment.setFailureReason(request.failureReason().trim());

        String note = "Shipment delivery failed: " + shipment.getFailureReason();
        if (payment != null && payment.getMethod() == PaymentMethod.COD && payment.getStatus() == PaymentStatus.PENDING) {
            payment.setStatus(PaymentStatus.CANCELLED);
            note = append(note, "Pending COD payment cancelled");
        } else if (payment != null && payment.getStatus() == PaymentStatus.SUCCESS) {
            createPendingRefund(changedBy, order, payment, request.failureReason());
            note = append(note, "Refund request created and is awaiting payment-provider confirmation");
        }

        restoreStock(order);
        note = append(note, "Inventory restocked");
        if (order.getPromotionId() != null) {
            promotionService.release(order);
            note = append(note, "Coupon " + order.getPromotionCode() + " released");
        }
        changeOrderStatus(order, OrderStatus.DELIVERY_FAILED, changedBy, note);
    }

    private Order lockedOrder(UUID orderId) {
        return orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng."));
    }

    private Shipment lockedShipment(UUID orderId) {
        return shipmentRepository.findByOrderIdForUpdate(orderId)
                .orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Đơn hàng này chưa có vận đơn."));
    }

    private void requireInTransit(Order order, Shipment shipment, ErrorCode errorCode) {
        if (order.getStatus() != OrderStatus.SHIPPING || shipment.getStatus() != ShipmentStatus.IN_TRANSIT) {
            throw new AppException(errorCode, "Order must be SHIPPING with an IN_TRANSIT shipment");
        }
    }

    private void createPendingRefund(UUID changedBy, Order order, Payment payment, String reason) {
        if (paymentRefundRepository.existsByPaymentId(payment.getId())) {
            throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS, "Khoản thanh toán này đã có yêu cầu hoàn tiền.");
        }
        PaymentRefund refund = new PaymentRefund();
        refund.setPayment(payment);
        refund.setOrder(order);
        refund.setAmount(payment.getAmount());
        refund.setStatus(RefundStatus.PENDING);
        refund.setReason(reason.trim());
        refund.setIdempotencyKey("DELIVERY_FAILED:" + payment.getId());
        refund.setRequestedBy(userRepository.findById(changedBy)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy người thực hiện thay đổi.")));
        paymentRefundRepository.save(refund);
    }

    /** Hoàn kho bằng UPDATE atomic, cùng lý do với decreaseStock ở OrderServiceImpl.checkout. */
    private void restoreStock(Order order) {
        for (OrderItem item : order.getItems()) {
            if (item.getProductVariantId() != null) {
                if (productVariantRepository.increaseStock(item.getProductVariantId(), item.getQuantity()) == 0) {
                    throw new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
                            "Phiên bản sản phẩm trong đơn hàng này không còn tồn tại.");
                }
            } else {
                productRepository.increaseStock(item.getProductId(), item.getQuantity());
            }
        }
    }

    private void changeOrderStatus(Order order, OrderStatus next, UUID changedBy, String note) {
        OrderStatus from = order.getStatus();
        order.setStatus(next);
        orderStatusHistoryService.record(order, from, next, changedBy, note);
    }

    private String append(String current, String addition) {
        if (addition == null || addition.isBlank()) {
            return current;
        }
        return current == null || current.isBlank() ? addition.trim() : current.trim() + "; " + addition.trim();
    }
}
