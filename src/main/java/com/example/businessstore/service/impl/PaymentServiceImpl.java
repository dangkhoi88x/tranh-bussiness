package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.dto.request.CreatePaymentRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.service.PaymentService;
import com.example.businessstore.service.OrderStatusHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Instant EARLIEST_MANAGEMENT_DATE = Instant.EPOCH;
    private static final Instant LATEST_MANAGEMENT_DATE = Instant.parse("9999-12-31T23:59:59.999999Z");
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderStatusHistoryService orderStatusHistoryService;

    @Override @Transactional
    public PaymentResponse create(UUID userId, UUID orderId, CreatePaymentRequest request) {
        Order order = orderRepository.findByIdAndUserIdForUpdate(orderId, userId).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng."));
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.DELIVERED) throw new AppException(ErrorCode.ORDER_NOT_PAYABLE, "Đơn hàng này chưa thanh toán được.");
        if (paymentRepository.existsByOrderIdAndStatus(orderId, PaymentStatus.PENDING)) throw new AppException(ErrorCode.PAYMENT_ALREADY_EXISTS, "Đơn hàng này đã có một khoản thanh toán đang chờ.");
        if (request.method() != PaymentMethod.COD) throw new AppException(ErrorCode.PAYMENT_METHOD_NOT_SUPPORTED, "Hiện chỉ hỗ trợ thanh toán khi nhận hàng (COD).");
        Payment payment = new Payment(); payment.setOrder(order); payment.setAmount(order.getTotalAmount()); payment.setMethod(request.method()); payment.setStatus(PaymentStatus.PENDING); payment.setTransactionCode(nextCode());
        try { PaymentResponse response = toResponse(paymentRepository.saveAndFlush(payment)); orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), userId, "COD payment created"); return response; }
        catch (DataIntegrityViolationException exception) { throw new AppException(ErrorCode.PAYMENT_ALREADY_EXISTS, "Đơn hàng này đã có một khoản thanh toán đang chờ."); }
    }
    @Override @Transactional(readOnly = true) public PageResponse<PaymentResponse> getMine(UUID userId, int page, int size) { return toPage(paymentRepository.findByOrderUserId(userId, pageRequest(page, size)), page); }
    @Override @Transactional(readOnly = true) public PaymentResponse getMineById(UUID userId, UUID paymentId) { return toResponse(paymentRepository.findByIdAndOrderUserId(paymentId, userId).orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Không tìm thấy khoản thanh toán."))); }
    @Override @Transactional(readOnly = true) public PageResponse<PaymentResponse> getAll(PaymentStatus status, String orderCode, LocalDate createdFrom, LocalDate createdTo, int page, int size) {
        if (createdFrom != null && createdTo != null && createdFrom.isAfter(createdTo)) throw new AppException(ErrorCode.INVALID_REQUEST, "Ngày tạo từ không được sau ngày tạo đến.");
        Instant from = createdFrom == null ? EARLIEST_MANAGEMENT_DATE : createdFrom.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant toExclusive = createdTo == null ? LATEST_MANAGEMENT_DATE : createdTo.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        String code = orderCode == null || orderCode.isBlank() ? null : orderCode.trim();
        return toPage(paymentRepository.searchForManagement(status, code, from, toExclusive, pageRequest(page, size)), page);
    }
    @Override @Transactional
    public PaymentResponse confirmCod(UUID changedBy, UUID paymentId) {
        Payment existing = paymentRepository.findById(paymentId).orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Không tìm thấy khoản thanh toán."));
        Order order = orderRepository.findByIdForUpdate(existing.getOrder().getId()).orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng."));
        Payment payment = paymentRepository.findByIdForUpdate(paymentId).orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Không tìm thấy khoản thanh toán."));
        if (payment.getMethod() != PaymentMethod.COD || payment.getStatus() != PaymentStatus.PENDING) throw new AppException(ErrorCode.PAYMENT_CANNOT_BE_COMPLETED, "Không thể hoàn tất khoản thanh toán này.");
        if (order.getStatus() != OrderStatus.DELIVERED) throw new AppException(ErrorCode.ORDER_NOT_PAYABLE, "Chỉ ghi nhận thu tiền COD sau khi đã giao hàng.");
        payment.setStatus(PaymentStatus.SUCCESS); payment.setPaidAt(Instant.now()); orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), changedBy, "COD payment confirmed"); return toResponse(payment);
    }
    private PageRequest pageRequest(int page, int size) { return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")); }
    private PageResponse<PaymentResponse> toPage(Page<Payment> payments, int requestedPage) { return new PageResponse<>(payments.getContent().stream().map(this::toResponse).toList(), Math.max(requestedPage, 1), payments.getSize(), payments.getTotalElements(), payments.getTotalPages(), payments.hasNext()); }
    private PaymentResponse toResponse(Payment p) { return new PaymentResponse(p.getId(), p.getOrder().getId(), p.getOrder().getOrderCode(), p.getAmount(), p.getMethod(), p.getStatus(), p.getTransactionCode(), p.getPaidAt(), p.getCreatedAt()); }
    private String nextCode() { String value; do { value = "PAY-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(); } while (paymentRepository.existsByTransactionCode(value)); return value; }
}
