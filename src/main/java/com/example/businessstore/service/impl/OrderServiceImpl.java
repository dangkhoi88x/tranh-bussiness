package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.CheckoutOrderRequest;
import com.example.businessstore.dto.response.OrderItemResponse;
import com.example.businessstore.dto.response.OrderCustomDetailsResponse;
import com.example.businessstore.dto.response.OrderResponse;
import com.example.businessstore.dto.response.OrderShippingAddressResponse;
import com.example.businessstore.dto.response.OrderStatusHistoryResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.OrderCustomDetails;
import com.example.businessstore.entity.CustomOrderRequest;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ShippingAddress;
import com.example.businessstore.entity.OrderShippingAddress;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.OrderService;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PromotionLine;
import com.example.businessstore.service.PromotionService;
import com.example.businessstore.service.ShippingAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<OrderStatus> CANCELLABLE = Set.of(OrderStatus.PENDING, OrderStatus.CONFIRMED);
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PaymentRepository paymentRepository;
    private final OrderStatusHistoryService orderStatusHistoryService;
    private final ShippingAddressService shippingAddressService;
    private final PromotionService promotionService;

    @Override @Transactional
    public OrderResponse checkout(UUID userId, CheckoutOrderRequest request) {
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_EMPTY, "Cart is empty"));
        if (cart.getItems().isEmpty()) throw new AppException(ErrorCode.CART_EMPTY, "Cart is empty");

        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setUser(cart.getUser());
        ShippingAddress address = shippingAddressService.getOwned(userId, request.shippingAddressId());
        OrderShippingAddress snapshot = new OrderShippingAddress();
        snapshot.setOrder(order); snapshot.setRecipientName(address.getRecipientName()); snapshot.setPhone(address.getPhone()); snapshot.setProvince(address.getProvince()); snapshot.setDistrict(address.getDistrict()); snapshot.setWard(address.getWard()); snapshot.setAddressLine(address.getAddressLine());
        order.setShippingAddressSnapshot(snapshot);
        order.setShippingAddress(formatAddress(address));
        order.setStatus(OrderStatus.PENDING);
        order.setDiscountAmount(BigDecimal.ZERO);
        BigDecimal subtotal = BigDecimal.ZERO;
        List<PromotionLine> promotionLines = new ArrayList<>();
        for (CartItem cartItem : cart.getItems()) {
            Product product = productRepository.findById(cartItem.getProduct().getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
            if (product.getStatus() != ProductStatus.PUBLISHED) throw new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE, "Product is not available");
            ProductVariant variant = lockSelectedVariant(product, cartItem.getProductVariant());
            Product lockedProduct = variant == null ? productRepository.findByIdForUpdate(product.getId()).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found")) : product;
            int stock = variant == null ? lockedProduct.getStockQuantity() : variant.getStockQuantity();
            if (cartItem.getQuantity() > stock) throw new AppException(ErrorCode.INSUFFICIENT_PRODUCT_STOCK, "Requested quantity exceeds available stock");
            ProductFrameOption option = cartItem.getProductFrameOption();
            validateFrameCompatibility(option, variant);
            BigDecimal adjustment = option == null ? BigDecimal.ZERO : option.getPriceAdjustment();
            BigDecimal basePrice = variant == null ? lockedProduct.getPrice() : variant.getPrice();
            BigDecimal unitPrice = basePrice.add(adjustment);
            OrderItem item = new OrderItem();
            item.setProductId(lockedProduct.getId()); item.setProductName(lockedProduct.getName()); item.setProductSlug(lockedProduct.getSlug());
            item.setProductPrice(basePrice); item.setFramePriceAdjustment(adjustment); item.setUnitPrice(unitPrice);
            item.setQuantity(cartItem.getQuantity()); item.setLineTotal(unitPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity())));
            if (variant != null) { item.setProductVariantId(variant.getId()); item.setVariantSku(variant.getSku()); item.setVariantName(variant.getName()); item.setVariantMaterial(variant.getMaterial()); item.setVariantWidthCm(variant.getWidthCm()); item.setVariantHeightCm(variant.getHeightCm()); }
            if (option != null) { item.setProductFrameOptionId(option.getId()); item.setFrameName(option.getFrame().getName()); }
            order.addItem(item); subtotal = subtotal.add(item.getLineTotal());
            promotionLines.add(new PromotionLine(lockedProduct.getCategory().getId(), lockedProduct.getId(),
                    variant == null ? null : variant.getId(),
                    basePrice.multiply(BigDecimal.valueOf(cartItem.getQuantity()))));
            if (variant == null) lockedProduct.setStockQuantity(stock - cartItem.getQuantity()); else variant.setStockQuantity(stock - cartItem.getQuantity());
        }
        order.setSubtotalAmount(subtotal);
        order.setTotalAmount(subtotal);
        Order saved = orderRepository.save(order);
        if (request.couponCode() != null && !request.couponCode().isBlank()) {
            var calculation = promotionService.reserve(userId, saved, request.couponCode(), subtotal, promotionLines);
            saved.setPromotionId(calculation.promotionId());
            saved.setPromotionCode(calculation.couponCode());
            saved.setDiscountAmount(calculation.discountAmount());
            saved.setTotalAmount(calculation.totalAmount());
            orderStatusHistoryService.record(saved, OrderStatus.PENDING, OrderStatus.PENDING, userId,
                    "Coupon " + calculation.couponCode() + " reserved; discount " + calculation.discountAmount());
        }
        cart.getItems().clear();
        return toResponse(saved);
    }

    @Override @Transactional
    public OrderResponse createFromCustomRequest(UUID userId, UUID shippingAddressId, CustomOrderRequest request) {
        if (!request.getUser().getId().equals(userId)) throw new AppException(ErrorCode.FORBIDDEN, "Custom request does not belong to the authenticated user");
        if (request.getQuotedPrice() == null) throw new AppException(ErrorCode.INVALID_CUSTOM_ORDER_STATUS, "A quoted price is required before creating an order");
        ShippingAddress address = shippingAddressService.getOwned(userId, shippingAddressId);
        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setUser(request.getUser());
        order.setShippingAddress(formatAddress(address));
        OrderShippingAddress snapshot = new OrderShippingAddress();
        snapshot.setOrder(order); snapshot.setRecipientName(address.getRecipientName()); snapshot.setPhone(address.getPhone()); snapshot.setProvince(address.getProvince()); snapshot.setDistrict(address.getDistrict()); snapshot.setWard(address.getWard()); snapshot.setAddressLine(address.getAddressLine());
        order.setShippingAddressSnapshot(snapshot);
        order.setStatus(OrderStatus.PENDING);
        order.setSubtotalAmount(request.getQuotedPrice());
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setTotalAmount(request.getQuotedPrice());
        OrderCustomDetails details = new OrderCustomDetails();
        details.setOrder(order); details.setCustomOrderRequestId(request.getId()); details.setRequestCode(request.getRequestCode()); details.setRequestType(request.getType()); details.setWidthCm(request.getWidthCm()); details.setHeightCm(request.getHeightCm()); details.setMaterial(request.getMaterial()); details.setQuotedPrice(request.getQuotedPrice());
        if (request.getSelectedFrame() != null) { details.setFrameId(request.getSelectedFrame().getId()); details.setFrameName(request.getSelectedFrame().getName()); }
        order.setCustomDetails(details);
        return toResponse(orderRepository.save(order));
    }

    @Override @Transactional(readOnly = true) public PageResponse<OrderResponse> getMine(UUID userId, int page, int size) { return toPage(orderRepository.findByUserId(userId, pageRequest(page, size)), page); }
    @Override @Transactional(readOnly = true) public OrderResponse getMineById(UUID userId, UUID orderId) { return toResponse(orderRepository.findByIdAndUserId(orderId, userId).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"))); }
    @Override @Transactional(readOnly = true) public PageResponse<OrderResponse> getAll(int page, int size) { return toPage(orderRepository.findAll(pageRequest(page, size)), page); }
    @Override @Transactional(readOnly = true) public OrderResponse getForManagement(UUID orderId) { return toResponse(getOrder(orderId)); }

    @Override @Transactional
    public OrderResponse updateStatus(UUID changedBy, UUID orderId, OrderStatus status, String note) {
        Order order = getOrderForUpdate(orderId);
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED || order.getStatus() == OrderStatus.DELIVERY_FAILED) throw new AppException(ErrorCode.INVALID_ORDER_STATUS, "Completed, failed, or cancelled orders cannot be changed");
        if (status == OrderStatus.CANCELLED) return cancelOrder(order, changedBy, note);
        if (!allowed(order.getStatus(), status)) throw new AppException(ErrorCode.INVALID_ORDER_STATUS, "Invalid order status transition");
        if (status == OrderStatus.CONFIRMED && order.getPromotionId() != null) {
            promotionService.consume(order);
            note = appendNote(note, "Coupon " + order.getPromotionCode() + " consumed");
        }
        changeStatus(order, status, changedBy, note); return toResponse(order);
    }
    @Override @Transactional
    public OrderResponse cancel(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserIdForUpdate(orderId, userId).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));
        return cancelOrder(order, userId, "Order cancelled by customer");
    }
    private OrderResponse cancelOrder(Order order, UUID changedBy, String note) {
        if (!CANCELLABLE.contains(order.getStatus())) throw new AppException(ErrorCode.ORDER_CANNOT_BE_CANCELLED, "Orders can no longer be cancelled after shipping starts");
        restoreStock(order);
        cancelPendingPayment(order);
        if (order.getPromotionId() != null) {
            promotionService.release(order);
            note = appendNote(note, "Coupon " + order.getPromotionCode() + " released");
        }
        changeStatus(order, OrderStatus.CANCELLED, changedBy, note == null ? "Order cancelled; pending COD payment cancelled" : note);
        return toResponse(order);
    }
    private boolean allowed(OrderStatus current, OrderStatus next) { return current == OrderStatus.PENDING && next == OrderStatus.CONFIRMED; }
    private void changeStatus(Order order, OrderStatus next, UUID changedBy, String note) { OrderStatus from = order.getStatus(); order.setStatus(next); orderStatusHistoryService.record(order, from, next, changedBy, note); }
    private Order getOrder(UUID id) { return orderRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found")); }
    private Order getOrderForUpdate(UUID id) { return orderRepository.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found")); }
    private PageRequest pageRequest(int page, int size) { return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")); }
    private PageResponse<OrderResponse> toPage(Page<Order> orders, int requestedPage) { return new PageResponse<>(orders.getContent().stream().map(this::toResponse).toList(), Math.max(requestedPage, 1), orders.getSize(), orders.getTotalElements(), orders.getTotalPages(), orders.hasNext()); }
    private OrderResponse toResponse(Order order) { List<OrderItemResponse> items = order.getItems().stream().map(i -> new OrderItemResponse(i.getId(), i.getProductId(), i.getProductName(), i.getProductSlug(), i.getProductVariantId(), i.getVariantSku(), i.getVariantName(), i.getVariantMaterial(), i.getVariantWidthCm(), i.getVariantHeightCm(), i.getProductFrameOptionId(), i.getFrameName(), i.getProductPrice(), i.getFramePriceAdjustment(), i.getUnitPrice(), i.getQuantity(), i.getLineTotal())).toList(); OrderShippingAddress snapshot = order.getShippingAddressSnapshot(); OrderShippingAddressResponse address = snapshot == null ? null : new OrderShippingAddressResponse(snapshot.getRecipientName(), snapshot.getPhone(), snapshot.getProvince(), snapshot.getDistrict(), snapshot.getWard(), snapshot.getAddressLine()); OrderCustomDetails details = order.getCustomDetails(); OrderCustomDetailsResponse customDetails = details == null ? null : new OrderCustomDetailsResponse(details.getCustomOrderRequestId(), details.getRequestCode(), details.getRequestType(), details.getWidthCm(), details.getHeightCm(), details.getMaterial(), details.getFrameId(), details.getFrameName(), details.getQuotedPrice()); return new OrderResponse(order.getId(), order.getOrderCode(), order.getStatus(), order.getShippingAddress(), address, order.getSubtotalAmount(), order.getDiscountAmount(), order.getTotalAmount(), order.getPromotionId(), order.getPromotionCode(), customDetails, items, order.getCreatedAt()); }
    @Override @Transactional(readOnly = true) public List<OrderStatusHistoryResponse> getMineHistory(UUID userId, UUID orderId) { return orderStatusHistoryService.getMine(userId, orderId); }
    @Override @Transactional(readOnly = true) public List<OrderStatusHistoryResponse> getHistoryForManagement(UUID orderId) { return orderStatusHistoryService.getForManagement(orderId); }
    @Override @Transactional
    public void expirePromotionReservation(UUID orderId) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElse(null);
        if (order == null || order.getStatus() != OrderStatus.PENDING || order.getPromotionId() == null) return;
        restoreStock(order);
        cancelPendingPayment(order);
        promotionService.expire(order);
        OrderStatus from = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        orderStatusHistoryService.recordSystem(order, from, OrderStatus.CANCELLED,
                "Order cancelled because coupon " + order.getPromotionCode() + " reservation expired");
    }
    private void restoreStock(Order order) {
        order.getItems().forEach(item -> {
            if (item.getProductVariantId() != null) productVariantRepository.findByIdForUpdate(item.getProductVariantId())
                    .ifPresent(variant -> variant.setStockQuantity(variant.getStockQuantity() + item.getQuantity()));
            else productRepository.findByIdForUpdate(item.getProductId())
                    .ifPresent(product -> product.setStockQuantity(product.getStockQuantity() + item.getQuantity()));
        });
    }
    private void cancelPendingPayment(Order order) {
        paymentRepository.findByOrderIdAndStatus(order.getId(), PaymentStatus.PENDING)
                .ifPresent(payment -> payment.setStatus(PaymentStatus.CANCELLED));
    }
    private String appendNote(String note, String addition) {
        return note == null || note.isBlank() ? addition : note.trim() + "; " + addition;
    }
    private ProductVariant lockSelectedVariant(Product product, ProductVariant selected) {
        if (selected == null) {
            if (productVariantRepository.existsByProductId(product.getId())) throw new AppException(ErrorCode.PRODUCT_VARIANT_REQUIRED, "Product variant is required");
            return null;
        }
        return productVariantRepository.findByIdForUpdate(selected.getId())
                .filter(variant -> variant.getProduct().getId().equals(product.getId()) && variant.isAvailable())
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_AVAILABLE, "Product variant is not available"));
    }
    private void validateFrameCompatibility(ProductFrameOption option, ProductVariant variant) {
        if (option == null) return;
        if (!option.isAvailable() || option.getFrame().getStatus() != com.example.businessstore.constant.FrameStatus.ACTIVE) throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE, "Frame is not available");
        if (variant == null) return;
        boolean compatible = (option.getMinWidthCm() == null || variant.getWidthCm().compareTo(option.getMinWidthCm()) >= 0) && (option.getMaxWidthCm() == null || variant.getWidthCm().compareTo(option.getMaxWidthCm()) <= 0) && (option.getMinHeightCm() == null || variant.getHeightCm().compareTo(option.getMinHeightCm()) >= 0) && (option.getMaxHeightCm() == null || variant.getHeightCm().compareTo(option.getMaxHeightCm()) <= 0);
        if (!compatible) throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE, "Frame is not compatible with product variant");
    }
    private String formatAddress(ShippingAddress address) { return String.join(", ", address.getAddressLine(), address.getWard(), address.getDistrict(), address.getProvince()); }
    private String generateOrderCode() { String base = "ART-" + LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.BASIC_ISO_DATE) + "-"; String code; do { code = base + UUID.randomUUID().toString().substring(0, 8).toUpperCase(); } while (orderRepository.existsByOrderCode(code)); return code; }
}
