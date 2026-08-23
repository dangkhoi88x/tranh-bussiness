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
import com.example.businessstore.event.OrderShippedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import java.util.UUID;
@Service @RequiredArgsConstructor
public class ShipmentServiceImpl implements ShipmentService {
    private static final int MAX_PAGE_SIZE = 100;
    private final ShipmentRepository shipmentRepository; private final OrderRepository orderRepository; private final PaymentRepository paymentRepository; private final OrderStatusHistoryService orderStatusHistoryService; private final ApplicationEventPublisher eventPublisher;
    @Override @Transactional public ShipmentResponse create(UUID changedBy, UUID orderId, CreateShipmentRequest input) {
        Order order = orderRepository.findByIdForUpdate(orderId).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng."));
        if (order.getStatus() != OrderStatus.CONFIRMED) throw new AppException(ErrorCode.SHIPMENT_NOT_READY, "Chỉ bàn giao cho đơn vị vận chuyển được với đơn đã xác nhận.");
        Payment payment = paymentRepository.findByOrderIdAndMethodAndStatus(orderId, PaymentMethod.COD, PaymentStatus.PENDING)
                .orElseThrow(() -> new AppException(ErrorCode.COD_PAYMENT_REQUIRED, "Đơn phải có khoản COD đang chờ thu thì mới tạo được vận đơn."));
        // Khoá order ở trên đã tuần tự hoá mọi lần create/reactivate của cùng đơn.
        // CANCELLED là terminal với updateStatus, nên không cần khoá thêm shipment theo thứ tự ngược.
        Shipment shipment = shipmentRepository.findByOrderId(orderId).orElse(null);
        if (shipment != null && shipment.getStatus() != ShipmentStatus.CANCELLED) {
            throw new AppException(ErrorCode.SHIPMENT_ALREADY_EXISTS, "Đơn hàng này đã có vận đơn đang hoạt động.");
        }
        String trackingCode = input.trackingCode().trim();
        boolean duplicatedTrackingCode = shipment == null
                ? shipmentRepository.existsByTrackingCode(trackingCode)
                : shipmentRepository.existsByTrackingCodeAndIdNot(trackingCode, shipment.getId());
        if (duplicatedTrackingCode) throw new AppException(ErrorCode.TRACKING_CODE_ALREADY_EXISTS, "Mã vận đơn này đã tồn tại.");
        boolean reactivated = shipment != null;
        if (!reactivated) {
            shipment = new Shipment();
            shipment.setOrder(order);
        }
        shipment.setCarrier(input.carrier().trim()); shipment.setTrackingCode(trackingCode); shipment.setShippingFee(input.shippingFee()); shipment.setStatus(ShipmentStatus.READY);
        shipment.setShippedAt(null); shipment.setDeliveredAt(null); shipment.setFailedAt(null); shipment.setFailureReason(null);
        order.setTotalAmount(order.getSubtotalAmount().subtract(order.getDiscountAmount()).add(input.shippingFee()));
        payment.setAmount(order.getTotalAmount());
        Shipment saved = reactivated ? shipment : shipmentRepository.save(shipment);
        String action = reactivated ? "reactivated" : "created";
        orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), changedBy,
                "Shipment READY " + action + " with carrier " + saved.getCarrier());
        return toResponse(saved);
    }
    @Override @Transactional(readOnly = true) public ShipmentResponse getMine(UUID userId, UUID orderId) { return toResponse(shipmentRepository.findByOrderIdAndOrderUserId(orderId, userId).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Không tìm thấy vận đơn."))); }
    @Override @Transactional(readOnly = true) public ShipmentResponse getForManagement(UUID orderId) { return toResponse(shipmentRepository.findByOrderId(orderId).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Không tìm thấy vận đơn."))); }
    @Override @Transactional(readOnly = true) public PageResponse<ShipmentResponse> getAll(ShipmentStatus status, String carrier, String trackingCode, int page, int size) {
        int normalizedPage = Math.max(page, 1);
        Page<Shipment> shipments = shipmentRepository.searchForManagement(status, normalizeFilter(carrier), normalizeFilter(trackingCode),
                PageRequest.of(normalizedPage - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(shipments.getContent().stream().map(this::toResponse).toList(), normalizedPage, shipments.getSize(), shipments.getTotalElements(), shipments.getTotalPages(), shipments.hasNext());
    }
    @Override @Transactional public ShipmentResponse updateStatus(UUID changedBy, UUID id, UpdateShipmentStatusRequest input) {
        Shipment shipment = shipmentRepository.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.SHIPMENT_NOT_FOUND, "Không tìm thấy vận đơn."));
        Order order = orderRepository.findByIdForUpdate(shipment.getOrder().getId()).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng."));
        if (shipment.getStatus() == ShipmentStatus.DELIVERED || shipment.getStatus() == ShipmentStatus.CANCELLED) throw new AppException(ErrorCode.SHIPMENT_CANNOT_BE_CHANGED, "Vận đơn đã giao xong hoặc đã huỷ thì không đổi được nữa.");
        if (!allowed(shipment.getStatus(), input.status())) throw new AppException(ErrorCode.INVALID_SHIPMENT_STATUS, "Không thể chuyển vận đơn sang trạng thái này.");
        Instant now = Instant.now(); shipment.setStatus(input.status());
        if (input.status() == ShipmentStatus.IN_TRANSIT) { shipment.setShippedAt(now); changeOrderStatus(order, OrderStatus.SHIPPING, changedBy, "Shipment marked IN_TRANSIT"); publishOrderShipped(order, shipment); }
        if (input.status() == ShipmentStatus.CANCELLED) {
            Payment payment = paymentRepository.findByOrderIdAndMethodAndStatus(order.getId(), PaymentMethod.COD, PaymentStatus.PENDING)
                    .orElseThrow(() -> new AppException(ErrorCode.COD_PAYMENT_REQUIRED, "Không tìm thấy khoản COD đang chờ thu của đơn hàng."));
            shipment.setFailureReason(normalizeFilter(input.failureReason()));
            order.setTotalAmount(order.getSubtotalAmount().subtract(order.getDiscountAmount()));
            payment.setAmount(order.getTotalAmount());
            orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), changedBy,
                    "Shipment CANCELLED; order remains CONFIRMED and can be shipped again");
        }
        return toResponse(shipment);
    }
    private boolean allowed(ShipmentStatus current, ShipmentStatus next) { return current == ShipmentStatus.READY && (next == ShipmentStatus.IN_TRANSIT || next == ShipmentStatus.CANCELLED); }
    private void changeOrderStatus(Order order, OrderStatus next, UUID changedBy, String note) { OrderStatus from = order.getStatus(); order.setStatus(next); orderStatusHistoryService.record(order, from, next, changedBy, note); }
    private void publishOrderShipped(Order order, Shipment shipment) { User user = order.getUser(); eventPublisher.publishEvent(new OrderShippedEvent(user.getId(), user.getEmail(), user.getFirstName(), order.getId(), order.getOrderCode(), shipment.getCarrier(), shipment.getTrackingCode())); }
    private String normalizeFilter(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private ShipmentResponse toResponse(Shipment s) { return new ShipmentResponse(s.getId(), s.getOrder().getId(), s.getOrder().getOrderCode(), s.getCarrier(), s.getTrackingCode(), s.getShippingFee(), s.getStatus(), s.getShippedAt(), s.getDeliveredAt(), s.getFailedAt(), s.getFailureReason(), s.getCreatedAt(), s.getUpdatedAt()); }
}
