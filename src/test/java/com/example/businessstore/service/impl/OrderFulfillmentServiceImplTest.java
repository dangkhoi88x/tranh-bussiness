package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.ShipmentStatus;
import com.example.businessstore.dto.request.CompleteDeliveryRequest;
import com.example.businessstore.dto.request.DeliveryFailureRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.Shipment;
import com.example.businessstore.entity.User;
import com.example.businessstore.event.OrderDeliveredEvent;
import com.example.businessstore.event.OrderDeliveryFailedEvent;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRefundRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.ShipmentRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PromotionService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderFulfillmentServiceImplTest {

    @Mock private OrderRepository orderRepository;
    @Mock private ShipmentRepository shipmentRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentRefundRepository paymentRefundRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private UserRepository userRepository;
    @Mock private PromotionService promotionService;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;
    @InjectMocks private OrderFulfillmentServiceImpl fulfillmentService;

    @Test
    void completeDelivery_marksShipmentOrderAndPendingCodAsSuccessfulTogether() {
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        Order order = shippingOrder(orderId);
        Shipment shipment = inTransitShipment(order);
        Payment payment = pendingCod(order);
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(shipmentRepository.findByOrderIdForUpdate(orderId)).thenReturn(Optional.of(shipment));
        when(paymentRepository.findFirstByOrderIdForUpdate(orderId)).thenReturn(Optional.of(payment));

        fulfillmentService.completeDelivery(staffId, orderId, new CompleteDeliveryRequest("Đã giao tận tay"));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
        assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.DELIVERED);
        assertThat(shipment.getDeliveredAt()).isNotNull();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(payment.getPaidAt()).isNotNull();
        verify(orderStatusHistoryService).record(order, OrderStatus.SHIPPING, OrderStatus.DELIVERED, staffId,
                "Đã giao tận tay; Shipment delivered; COD payment collected");
        // Khách phải được báo là đơn đã giao xong; trước đây nhánh này im lặng hoàn toàn.
        ArgumentCaptor<OrderDeliveredEvent> captor = ArgumentCaptor.forClass(OrderDeliveredEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().orderCode()).isEqualTo("ART-001");
        assertThat(captor.getValue().email()).isEqualTo("an@example.com");
    }

    @Test
    void failDelivery_cancelsCodRestocksExactVariantAndReleasesCoupon() {
        UUID orderId = UUID.randomUUID();
        UUID staffId = UUID.randomUUID();
        UUID variantId = UUID.randomUUID();
        Order order = shippingOrder(orderId);
        order.setPromotionId(UUID.randomUUID());
        order.setPromotionCode("SAVE10");
        OrderItem item = new OrderItem();
        item.setProductVariantId(variantId);
        item.setQuantity(2);
        order.getItems().add(item);
        Shipment shipment = inTransitShipment(order);
        Payment payment = pendingCod(order);
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(shipmentRepository.findByOrderIdForUpdate(orderId)).thenReturn(Optional.of(shipment));
        when(paymentRepository.findFirstByOrderIdForUpdate(orderId)).thenReturn(Optional.of(payment));
        // Hoàn kho là UPDATE atomic; 1 dòng đổi được nghĩa là variant còn tồn tại.
        when(productVariantRepository.increaseStock(variantId, 2)).thenReturn(1);

        fulfillmentService.failDelivery(staffId, orderId,
                new DeliveryFailureRequest("Khách không nhận hàng", true));

        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERY_FAILED);
        assertThat(shipment.getStatus()).isEqualTo(ShipmentStatus.DELIVERY_FAILED);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        verify(productVariantRepository).increaseStock(variantId, 2);
        verify(promotionService).release(order);
        verify(orderStatusHistoryService).record(order, OrderStatus.SHIPPING, OrderStatus.DELIVERY_FAILED, staffId,
                "Shipment delivery failed: Khách không nhận hàng; Pending COD payment cancelled; Inventory restocked; Coupon SAVE10 released");
        // Đây là ca khách cần biết nhất: hàng không giao được và đã quay về kho.
        ArgumentCaptor<OrderDeliveryFailedEvent> captor = ArgumentCaptor.forClass(OrderDeliveryFailedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().orderCode()).isEqualTo("ART-001");
        assertThat(captor.getValue().failureReason()).isEqualTo("Khách không nhận hàng");
    }

    @Test
    void cannotCompleteDeliveryTwiceOrWithoutAnInTransitShipment() {
        UUID orderId = UUID.randomUUID();
        Order order = shippingOrder(orderId);
        Shipment shipment = inTransitShipment(order);
        shipment.setStatus(ShipmentStatus.DELIVERED);
        when(orderRepository.findByIdForUpdate(orderId)).thenReturn(Optional.of(order));
        when(shipmentRepository.findByOrderIdForUpdate(orderId)).thenReturn(Optional.of(shipment));

        assertThatThrownBy(() -> fulfillmentService.completeDelivery(UUID.randomUUID(), orderId,
                new CompleteDeliveryRequest(null)))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.ORDER_NOT_READY_FOR_COMPLETION);
    }

    private Order shippingOrder(UUID orderId) {
        Order order = new Order();
        order.setId(orderId);
        order.setOrderCode("ART-001");
        order.setStatus(OrderStatus.SHIPPING);
        order.setSubtotalAmount(BigDecimal.TEN);
        order.setTotalAmount(BigDecimal.TEN);
        // Order.user là optional = false ở JPA và NOT NULL dưới DB, nên đơn không có chủ là trạng
        // thái không thể tồn tại thật. Fixture phải gắn user thì thông báo cho khách mới gửi được.
        order.setUser(customer());
        return order;
    }

    private User customer() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("an@example.com");
        user.setFirstName("An");
        return user;
    }

    private Shipment inTransitShipment(Order order) {
        Shipment shipment = new Shipment();
        shipment.setOrder(order);
        shipment.setStatus(ShipmentStatus.IN_TRANSIT);
        return shipment;
    }

    private Payment pendingCod(Order order) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setMethod(PaymentMethod.COD);
        payment.setStatus(PaymentStatus.PENDING);
        payment.setAmount(BigDecimal.TEN);
        return payment;
    }
}
