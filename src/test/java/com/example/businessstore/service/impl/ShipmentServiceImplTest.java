package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.ShipmentStatus;
import com.example.businessstore.dto.request.CreateShipmentRequest;
import com.example.businessstore.dto.request.UpdateShipmentStatusRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.Shipment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ShipmentRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ShipmentServiceImplTest {
    @Mock private ShipmentRepository shipmentRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @InjectMocks private ShipmentServiceImpl shipmentService;

    @Test
    void create_requiresPendingCodAndIncludesShippingFeeInOrderAndPayment() {
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.CONFIRMED);
        Payment payment = new Payment();
        payment.setStatus(PaymentStatus.PENDING);

        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(paymentRepository.findByOrderIdAndMethodAndStatus(orderId, PaymentMethod.COD, PaymentStatus.PENDING)).thenReturn(Optional.of(payment));
        when(shipmentRepository.save(any(Shipment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        shipmentService.create(staffId, orderId, new CreateShipmentRequest("GHN", "GHN-001", new BigDecimal("30000.00")));

        ArgumentCaptor<Shipment> shipment = ArgumentCaptor.forClass(Shipment.class);
        org.mockito.Mockito.verify(shipmentRepository).save(shipment.capture());
        assertThat(shipment.getValue().getStatus()).isEqualTo(ShipmentStatus.READY);
        assertThat(order.getTotalAmount()).isEqualByComparingTo("280000.00");
        assertThat(payment.getAmount()).isEqualByComparingTo("280000.00");
        org.mockito.Mockito.verify(orderStatusHistoryService).record(order, OrderStatus.CONFIRMED, OrderStatus.CONFIRMED, staffId, "Shipment READY created with carrier GHN");
    }

    @Test
    void create_rejectsConfirmedOrderWithoutPendingCodPayment() {
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order(orderId, OrderStatus.CONFIRMED)));
        when(paymentRepository.findByOrderIdAndMethodAndStatus(orderId, PaymentMethod.COD, PaymentStatus.PENDING)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> shipmentService.create(staffId, orderId, new CreateShipmentRequest("GHN", "GHN-002", BigDecimal.ZERO)))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.COD_PAYMENT_REQUIRED);
    }

    @Test
    void deliveryFailure_mustUseOrderFulfillmentCommand() {
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.SHIPPING);
        Shipment shipment = new Shipment();
        shipment.setId(UUID.randomUUID());
        shipment.setOrder(order);
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);

        when(shipmentRepository.findByIdForUpdate(shipment.getId())).thenReturn(Optional.of(shipment));
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> shipmentService.updateStatus(staffId, shipment.getId(),
                new UpdateShipmentStatusRequest(ShipmentStatus.DELIVERY_FAILED, "Khách hẹn giao lại")))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_SHIPMENT_STATUS);
    }

    private Order order(UUID id, OrderStatus status) {
        Order order = new Order();
        order.setId(id);
        order.setOrderCode("ART-001");
        order.setStatus(status);
        order.setSubtotalAmount(new BigDecimal("250000.00"));
        order.setTotalAmount(new BigDecimal("250000.00"));
        return order;
    }
}
