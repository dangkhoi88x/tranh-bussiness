package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {
    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @InjectMocks private PaymentServiceImpl paymentService;

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
