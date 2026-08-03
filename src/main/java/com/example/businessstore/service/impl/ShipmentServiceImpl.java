package com.example.businessstore.service.impl;
import com.example.businessstore.constant.*;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.ShipmentResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.entity.*;
import com.example.businessstore.exception.*;
import com.example.businessstore.repository.*;
import com.example.businessstore.service.ShipmentService;
import com.example.businessstore.service.OrderStatusHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import java.time.Instant;
import java.util.UUID;
@Service @RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {
    private static final int MAX_PAGE_SIZE = 100;
    private final ShipmentRepository shipmentRepository; private final OrderRepository orderRepository; private final PaymentRepository paymentRepository; private final OrderStatusHistoryService orderStatusHistoryService;
    @Override @Transactional public ShipmentResponse create(UUID changedBy, UUID orderId, CreateShipmentRequest input) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));
        if (order.getStatus() != OrderStatus.CONFIRMED) throw new AppException(ErrorCode.SHIPMENT_NOT_READY, "Only confirmed orders can be handed to a carrier");
        Payment payment = paymentRepository.findByOrderIdAndMethodAndStatus(orderId, PaymentMethod.COD, PaymentStatus.PENDING)
                .orElseThrow(() -> new AppException(ErrorCode.COD_PAYMENT_REQUIRED, "A pending COD payment is required before creating a shipment"));
        if (shipmentRepository.findByOrderId(orderId).isPresent()) throw new AppException(ErrorCode.SHIPMENT_ALREADY_EXISTS, "Shipment already exists for this order");
        if (shipmentRepository.existsByTrackingCode(input.trackingCode().trim())) throw new AppException(ErrorCode.TRACKING_CODE_ALREADY_EXISTS, "Tracking code already exists");
        Shipment shipment = new Shipment(); shipment.setOrder(order); shipment.setCarrier(input.carrier().trim()); shipment.setTrackingCode(input.trackingCode().trim()); shipment.setShippingFee(input.shippingFee()); shipment.setStatus(ShipmentStatus.READY);
        order.setTotalAmount(order.getSubtotalAmount().subtract(order.getDiscountAmount()).add(input.shippingFee()));
        payment.setAmount(order.getTotalAmount());
        Shipment saved = shipmentRepository.save(shipment);
        orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), changedBy, "Shipment READY created with carrier " + saved.getCarrier());
        return toResponse(saved);
    }
    @Override @Transactional(readOnly = true) public ShipmentResponse getMine(UUID userId, UUID orderId) { return toResponse(shipmentRepository.findByOrderIdAndOrderUserId(orderId, userId).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Shipment not found"))); }
    @Override @Transactional(readOnly = true) public ShipmentResponse getForManagement(UUID orderId) { return toResponse(shipmentRepository.findByOrderId(orderId).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Shipment not found"))); }
    @Override @Transactional(readOnly = true) public PageResponse<ShipmentResponse> getAll(ShipmentStatus status, String carrier, String trackingCode, int page, int size) {
        int normalizedPage = Math.max(page, 1);
        Page<Shipment> shipments = shipmentRepository.searchForManagement(status, normalizeFilter(carrier), normalizeFilter(trackingCode),
                PageRequest.of(normalizedPage - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(shipments.getContent().stream().map(this::toResponse).toList(), normalizedPage, shipments.getSize(), shipments.getTotalElements(), shipments.getTotalPages(), shipments.hasNext());
    }
    @Override @Transactional public ShipmentResponse updateStatus(UUID changedBy, UUID id, UpdateShipmentStatusRequest input) {
        Shipment shipment = shipmentRepository.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Shipment not found"));
        Order order = orderRepository.findByIdForUpdate(shipment.getOrder().getId()).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Order not found"));
        if (shipment.getStatus() == ShipmentStatus.DELIVERED || shipment.getStatus() == ShipmentStatus.CANCELLED) throw new AppException(ErrorCode.SHIPMENT_CANNOT_BE_CHANGED, "Completed or cancelled shipments cannot be changed");
        if (!allowed(shipment.getStatus(), input.status())) throw new AppException(ErrorCode.INVALID_SHIPMENT_STATUS, "Invalid shipment status transition");
        Instant now = Instant.now(); shipment.setStatus(input.status());
        if (input.status() == ShipmentStatus.IN_TRANSIT) { shipment.setShippedAt(now); changeOrderStatus(order, OrderStatus.SHIPPING, changedBy, "Shipment marked IN_TRANSIT"); }
        if (input.status() == ShipmentStatus.DELIVERED) { shipment.setDeliveredAt(now); shipment.setFailureReason(null); changeOrderStatus(order, OrderStatus.DELIVERED, changedBy, "Shipment delivered"); }
        if (input.status() == ShipmentStatus.DELIVERY_FAILED) { shipment.setFailedAt(now); shipment.setFailureReason(input.failureReason() == null ? null : input.failureReason().trim()); changeOrderStatus(order, OrderStatus.DELIVERY_FAILED, changedBy, shipment.getFailureReason() == null ? "Shipment delivery failed" : "Shipment delivery failed: " + shipment.getFailureReason()); }
        return toResponse(shipment);
    }
    private boolean allowed(ShipmentStatus current, ShipmentStatus next) { return (current == ShipmentStatus.READY && (next == ShipmentStatus.IN_TRANSIT || next == ShipmentStatus.CANCELLED)) || (current == ShipmentStatus.IN_TRANSIT && (next == ShipmentStatus.DELIVERED || next == ShipmentStatus.DELIVERY_FAILED)) || (current == ShipmentStatus.DELIVERY_FAILED && next == ShipmentStatus.IN_TRANSIT); }
    private void changeOrderStatus(Order order, OrderStatus next, UUID changedBy, String note) { OrderStatus from = order.getStatus(); order.setStatus(next); orderStatusHistoryService.record(order, from, next, changedBy, note); }
    private String normalizeFilter(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private ShipmentResponse toResponse(Shipment s) { return new ShipmentResponse(s.getId(), s.getOrder().getId(), s.getOrder().getOrderCode(), s.getCarrier(), s.getTrackingCode(), s.getShippingFee(), s.getStatus(), s.getShippedAt(), s.getDeliveredAt(), s.getFailedAt(), s.getFailureReason(), s.getCreatedAt(), s.getUpdatedAt()); }
}
