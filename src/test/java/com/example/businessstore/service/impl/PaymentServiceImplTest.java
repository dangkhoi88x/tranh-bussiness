package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.dto.request.CreatePaymentRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {
    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @InjectMocks private PaymentServiceImpl paymentService;

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {"PENDING", "CONFIRMED"})
    void create_allowsOnlyPreFulfillmentOrderStatuses(OrderStatus status) {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setId(orderId);
        order.setOrderCode("ART-001");
        order.setStatus(status);
        order.setTotalAmount(new java.math.BigDecimal("250000"));

        when(orderRepository.findByIdAndUserIdForUpdate(orderId, userId)).thenReturn(Optional.of(order));
        when(paymentRepository.saveAndFlush(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = paymentService.create(userId, orderId, new CreatePaymentRequest(PaymentMethod.COD));

        assertThat(response.status()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.amount()).isEqualByComparingTo("250000");
    }

    @ParameterizedTest
    @EnumSource(value = OrderStatus.class, names = {
            "PROCESSING", "SHIPPING", "DELIVERY_FAILED", "DELIVERED", "CANCELLED"
    })
    void create_rejectsOrdersThatAlreadyEnteredOrFinishedFulfillment(OrderStatus status) {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Order order = new Order();
        order.setId(orderId);
        order.setStatus(status);
        when(orderRepository.findByIdAndUserIdForUpdate(orderId, userId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> paymentService.create(
                userId, orderId, new CreatePaymentRequest(PaymentMethod.COD)))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_NOT_PAYABLE);
        verify(paymentRepository, never()).saveAndFlush(any());
    }

    @Test
    void confirmCod_recordsPaymentEventInOrderHistory() {
        UUID paymentId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        Order order = new Order(); order.setId(orderId); order.setOrderCode("ART-001"); order.setStatus(OrderStatus.DELIVERED);
        Payment payment = new Payment(); payment.setId(paymentId); payment.setOrder(order); payment.setMethod(PaymentMethod.COD); payment.setStatus(PaymentStatus.PENDING);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(paymentRepository.findByIdForUpdate(paymentId)).thenReturn(Optional.of(payment));

        paymentService.confirmCod(staffId, paymentId);

        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        verify(orderStatusHistoryService).record(order, OrderStatus.DELIVERED, OrderStatus.DELIVERED, staffId, "COD payment confirmed");
    }
}
