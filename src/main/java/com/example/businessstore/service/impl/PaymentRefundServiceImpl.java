package com.example.businessstore.service.impl;

import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.dto.request.SettleRefundRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentRefundResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.PaymentRefund;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PaymentRefundRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import com.example.businessstore.service.PaymentRefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Hoàn tiền được tạo ở trạng thái PENDING khi giao thất bại một đơn đã thu COD
 * (OrderFulfillmentServiceImpl). Khách nhìn thấy ngay dòng "Đang xử lý hoàn tiền" ở đơn của
 * mình, nên phải có đường cho xưởng chốt lại — nếu không lời hứa đó treo vĩnh viễn.
 *
 * Việc chuyển tiền thật nằm ngoài hệ thống (chuyển khoản hoặc trả tiền mặt); ở đây chỉ ghi
 * nhận kết quả để khách thấy đúng và để còn đối soát.
 */
@Service
@RequiredArgsConstructor
public class PaymentRefundServiceImpl implements PaymentRefundService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PaymentRefundRepository paymentRefundRepository;
    private final OrderStatusHistoryService orderStatusHistoryService;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PaymentRefundResponse> getAll(RefundStatus status, String orderCode, int page, int size) {
        String code = orderCode == null || orderCode.isBlank() ? null : orderCode.trim();
        int normalizedPage = Math.max(page, 1);
        Page<PaymentRefund> refunds = paymentRefundRepository.searchForManagement(status, code,
                PageRequest.of(normalizedPage - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                        Sort.by(Sort.Direction.ASC, "status").and(Sort.by(Sort.Direction.DESC, "createdAt"))));
        return new PageResponse<>(refunds.getContent().stream().map(this::toResponse).toList(), normalizedPage,
                refunds.getSize(), refunds.getTotalElements(), refunds.getTotalPages(), refunds.hasNext());
    }

    @Override
    @Transactional
    public PaymentRefundResponse settle(UUID changedBy, UUID refundId, SettleRefundRequest request) {
        if (request.status() == RefundStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Chỉ chốt được hoàn tiền thành công hoặc thất bại.");
        }
        boolean failed = request.status() == RefundStatus.FAILED;
        String failureMessage = request.failureMessage() == null ? null : request.failureMessage().trim();
        if (failed && (failureMessage == null || failureMessage.isBlank())) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Hãy ghi lý do hoàn tiền thất bại.");
        }
        PaymentRefund refund = paymentRefundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND, "Không tìm thấy khoản hoàn tiền."));
        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new AppException(ErrorCode.REFUND_ALREADY_SETTLED, "Khoản hoàn tiền này đã được chốt trước đó.");
        }

        refund.setStatus(request.status());
        refund.setCompletedAt(Instant.now());
        refund.setFailureMessage(failed ? failureMessage : null);
        String providerRefundId = request.providerRefundId() == null ? null : request.providerRefundId().trim();
        refund.setProviderRefundId(providerRefundId == null || providerRefundId.isBlank() ? null : providerRefundId);

        // Đơn đã đóng ở DELIVERY_FAILED nên trạng thái không đổi; ghi vào lịch sử để sau này còn
        // truy ra ai chốt khoản tiền này và bằng chứng chuyển khoản là mã nào.
        Order order = refund.getOrder();
        orderStatusHistoryService.record(order, order.getStatus(), order.getStatus(), changedBy,
                failed ? "Refund marked FAILED: " + failureMessage
                        : "Refund marked SUCCESS" + (refund.getProviderRefundId() == null ? ""
                        : "; reference " + refund.getProviderRefundId()));
        return toResponse(refund);
    }

    private PaymentRefundResponse toResponse(PaymentRefund refund) {
        return new PaymentRefundResponse(
                refund.getId(),
                refund.getOrder().getId(),
                refund.getOrder().getOrderCode(),
                refund.getPayment().getId(),
                refund.getPayment().getTransactionCode(),
                refund.getAmount(),
                refund.getStatus(),
                refund.getReason(),
                refund.getProviderRefundId(),
                refund.getFailureMessage(),
                refund.getCompletedAt(),
                refund.getCreatedAt());
    }
}
