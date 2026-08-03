package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.CustomOrderRequest;
import com.example.businessstore.entity.ShippingAddress;
import com.example.businessstore.entity.User;
import com.example.businessstore.constant.CustomOrderRequestType;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.ShippingAddressService;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PromotionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {
    @Mock private CartRepository cartRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private ShippingAddressService shippingAddressService;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @Mock private PromotionService promotionService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private OrderServiceImpl orderService;

    @Test
    void cancel_pendingCodPayment_whenOrderIsCancelledBeforeShipping() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.CONFIRMED);
        order.setPromotionId(UUID.randomUUID());
        order.setPromotionCode("SAVE10");
        Payment payment = new Payment();
        payment.setStatus(PaymentStatus.PENDING);

        when(orderRepository.findByIdAndUserIdForUpdate(orderId, userId)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndStatus(orderId, PaymentStatus.PENDING)).thenReturn(Optional.of(payment));

        orderService.cancel(userId, orderId);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        verify(promotionService).release(order);
        verify(orderStatusHistoryService).record(order, OrderStatus.CONFIRMED, OrderStatus.CANCELLED, userId,
                "Order cancelled by customer; Coupon SAVE10 released");
    }

    @Test
    void confirm_consumesPromotionReservationBeforeChangingOrderStatus() {
        UUID staffId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.PENDING);
        order.setPromotionId(UUID.randomUUID());
        order.setPromotionCode("SAVE10");
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));

        orderService.updateStatus(staffId, orderId, OrderStatus.CONFIRMED, "Confirmed");

        verify(promotionService).consume(order);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(orderStatusHistoryService).record(order, OrderStatus.PENDING, OrderStatus.CONFIRMED, staffId,
                "Confirmed; Coupon SAVE10 consumed");
        org.mockito.ArgumentCaptor<OrderConfirmedEvent> event = org.mockito.ArgumentCaptor.forClass(OrderConfirmedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().orderId()).isEqualTo(orderId);
        assertThat(event.getValue().email()).isEqualTo("customer@example.com");
    }

    @Test
    void expirePromotionReservation_cancelsPendingOrderAndExpiresQuota() {
        UUID orderId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.PENDING);
        order.setPromotionId(UUID.randomUUID());
        order.setPromotionCode("SAVE10");
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndStatus(orderId, PaymentStatus.PENDING)).thenReturn(Optional.empty());

        orderService.expirePromotionReservation(orderId);

        verify(promotionService).expire(order);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
        verify(orderStatusHistoryService).recordSystem(order, OrderStatus.PENDING, OrderStatus.CANCELLED,
                "Order cancelled because coupon SAVE10 reservation expired");
    }

    @Test
    void cancel_rejectsOrderThatIsAlreadyShipping() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(orderRepository.findByIdAndUserIdForUpdate(orderId, userId)).thenReturn(Optional.of(order(orderId, OrderStatus.SHIPPING)));

        assertThatThrownBy(() -> orderService.cancel(userId, orderId))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_CANNOT_BE_CANCELLED);
    }

    @Test
    void createFromCustomRequest_snapshotsQuotedCustomDetails() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        User user = new User(); user.setId(userId);
        CustomOrderRequest request = new CustomOrderRequest();
        request.setId(UUID.randomUUID()); request.setUser(user); request.setRequestCode("REQ-001"); request.setType(CustomOrderRequestType.FAMILY_PHOTO); request.setWidthCm(new BigDecimal("40")); request.setHeightCm(new BigDecimal("60")); request.setMaterial("Canvas"); request.setQuotedPrice(new BigDecimal("900000"));
        ShippingAddress address = new ShippingAddress(); address.setRecipientName("An"); address.setPhone("0900000000"); address.setProvince("HCM"); address.setDistrict("Q1"); address.setWard("Ben Nghe"); address.setAddressLine("1 Nguyen Hue");
        when(shippingAddressService.getOwned(userId, addressId)).thenReturn(address);
        when(orderRepository.existsByOrderCode(any())).thenReturn(false);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        orderService.createFromCustomRequest(userId, addressId, request);

        org.mockito.ArgumentCaptor<Order> order = org.mockito.ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(order.capture());
        assertThat(order.getValue().getSubtotalAmount()).isEqualByComparingTo("900000");
        assertThat(order.getValue().getCustomDetails().getRequestCode()).isEqualTo("REQ-001");
        assertThat(order.getValue().getCustomDetails().getMaterial()).isEqualTo("Canvas");
    }

    private Order order(UUID id, OrderStatus status) {
        Order order = new Order();
        order.setId(id);
        order.setOrderCode("ART-001");
        User user = new User(); user.setId(UUID.randomUUID()); user.setEmail("customer@example.com"); user.setFirstName("Customer");
        order.setUser(user);
        order.setStatus(status);
        order.setSubtotalAmount(BigDecimal.TEN);
        order.setTotalAmount(BigDecimal.TEN);
        return order;
    }
}
