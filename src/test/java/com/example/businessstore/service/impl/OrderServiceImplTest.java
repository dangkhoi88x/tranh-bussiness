package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.CustomOrderRequest;
import com.example.businessstore.entity.ShippingAddress;
import com.example.businessstore.entity.User;
import com.example.businessstore.constant.CustomOrderRequestType;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.Shipment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.event.OrderConfirmedEvent;
import com.example.businessstore.event.OrderPlacedEvent;
import com.example.businessstore.dto.request.CheckoutOrderRequest;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.PaymentRefundRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.ShipmentRepository;
import com.example.businessstore.service.ShippingAddressService;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PhotobookProjectService;
import com.example.businessstore.service.PromotionService;
import com.example.businessstore.service.ProductSelectionPricingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {
    @Mock private CartRepository cartRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private PhotobookPageTierRepository photobookPageTierRepository;
    @Mock private PhotobookProjectService photobookProjectService;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentRefundRepository paymentRefundRepository;
    @Mock private ShipmentRepository shipmentRepository;
    @Mock private ShippingAddressService shippingAddressService;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @Mock private PromotionService promotionService;
    @Mock private ApplicationEventPublisher eventPublisher;
    private OrderServiceImpl orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderServiceImpl(
                cartRepository, orderRepository, productRepository, productVariantRepository,
                photobookProjectService, paymentRepository, paymentRefundRepository, shipmentRepository,
                orderStatusHistoryService, shippingAddressService, promotionService,
                new ProductSelectionPricingService(photobookPageTierRepository), eventPublisher);
    }

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
    void checkout_publishesReceiptEventWithTheFinalOrderTotal() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        User customer = new User(); customer.setId(userId); customer.setEmail("customer@example.com"); customer.setFirstName("Customer");
        Category category = new Category(); category.setId(UUID.randomUUID());
        Product product = new Product(); product.setId(UUID.randomUUID()); product.setName("Hoa sen"); product.setSlug("hoa-sen"); product.setStatus(com.example.businessstore.constant.ProductStatus.PUBLISHED); product.setStockQuantity(2); product.setPrice(new BigDecimal("250000")); product.setCategory(category);
        Cart cart = new Cart(); cart.setUser(customer);
        CartItem cartItem = new CartItem(); cartItem.setCart(cart); cartItem.setProduct(product); cartItem.setQuantity(1); cart.getItems().add(cartItem);
        ShippingAddress address = new ShippingAddress(); address.setRecipientName("Customer"); address.setPhone("0900000000"); address.setProvince("HCM"); address.setDistrict("Q1"); address.setWard("Ben Nghe"); address.setAddressLine("1 Nguyen Hue");

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(shippingAddressService.getOwned(userId, addressId)).thenReturn(address);
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));
        // Giữ chỗ tồn kho giờ là một câu UPDATE có điều kiện: trả 1 nghĩa là còn hàng và đã trừ.
        when(productRepository.decreaseStock(product.getId(), 1)).thenReturn(1);
        when(productVariantRepository.existsByProductId(product.getId())).thenReturn(false);
        when(orderRepository.existsByOrderCode(any())).thenReturn(false);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> { Order saved = invocation.getArgument(0); saved.setId(orderId); return saved; });

        orderService.checkout(userId, new CheckoutOrderRequest(addressId, null));

        org.mockito.ArgumentCaptor<OrderPlacedEvent> event = org.mockito.ArgumentCaptor.forClass(OrderPlacedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().orderId()).isEqualTo(orderId);
        assertThat(event.getValue().totalAmount()).isEqualByComparingTo("250000");
    }

    @Test
    void checkout_reservesStockWithTheConditionalUpdateAndFailsWhenItTakesNothing() {
        UUID userId = UUID.randomUUID();
        UUID addressId = UUID.randomUUID();
        Category category = new Category(); category.setId(UUID.randomUUID());
        Product product = new Product();
        product.setId(UUID.randomUUID()); product.setName("Tranh sen"); product.setSlug("tranh-sen");
        product.setPrice(new BigDecimal("250000")); product.setStatus(com.example.businessstore.constant.ProductStatus.PUBLISHED);
        product.setStockQuantity(1); product.setCategory(category);
        Cart cart = new Cart();
        CartItem cartItem = new CartItem(); cartItem.setCart(cart); cartItem.setProduct(product); cartItem.setQuantity(1); cart.getItems().add(cartItem);
        ShippingAddress address = new ShippingAddress(); address.setRecipientName("Customer"); address.setPhone("0900000000"); address.setProvince("HCM"); address.setDistrict("Q1"); address.setWard("Ben Nghe"); address.setAddressLine("1 Nguyen Hue");

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(shippingAddressService.getOwned(userId, addressId)).thenReturn(address);
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(productRepository.findByIdForUpdate(product.getId())).thenReturn(Optional.of(product));
        // 0 dòng bị ảnh hưởng = người khác vừa lấy mất cái cuối giữa lúc mình đang thanh toán.
        when(productRepository.decreaseStock(product.getId(), 1)).thenReturn(0);

        assertThatThrownBy(() -> orderService.checkout(userId, new CheckoutOrderRequest(addressId, null)))
                .isInstanceOf(AppException.class)
                .extracting(cause -> ((AppException) cause).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_PRODUCT_STOCK);

        // Đọc tồn kho rồi mới trừ là bán quá hàng khi hai phiên chạy song song; bài này chốt
        // rằng checkout thật sự đi qua câu UPDATE có điều kiện chứ không tự tính lại số mới.
        verify(productRepository).decreaseStock(product.getId(), 1);
        verify(orderRepository, never()).save(any(Order.class));
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

    @Test
    void getMineById_includesLatestPaymentAndShippingFee() {
        UUID userId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        Order order = order(orderId, OrderStatus.CONFIRMED);
        Payment payment = new Payment();
        payment.setMethod(PaymentMethod.COD);
        payment.setStatus(PaymentStatus.PENDING);
        Shipment shipment = new Shipment();
        shipment.setShippingFee(new BigDecimal("30000"));
        when(orderRepository.findByIdAndUserId(orderId, userId)).thenReturn(Optional.of(order));
        when(paymentRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(Optional.of(payment));
        when(shipmentRepository.findByOrderId(orderId)).thenReturn(Optional.of(shipment));

        var response = orderService.getMineById(userId, orderId);

        assertThat(response.paymentMethod()).isEqualTo(PaymentMethod.COD);
        assertThat(response.paymentStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.shippingFee()).isEqualByComparingTo("30000");
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
