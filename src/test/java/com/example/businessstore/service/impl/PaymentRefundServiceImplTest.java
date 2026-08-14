package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.dto.request.SettleRefundRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Payment;
import com.example.businessstore.entity.PaymentRefund;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PaymentRefundRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentRefundServiceImplTest {

    @Mock private PaymentRefundRepository paymentRefundRepository;
    @Mock private OrderStatusHistoryService orderStatusHistoryService;
    @InjectMocks private PaymentRefundServiceImpl paymentRefundService;

    private final UUID staffId = UUID.randomUUID();
    private final UUID refundId = UUID.randomUUID();

    private PaymentRefund pendingRefund() {
        Order order = new Order();
        order.setOrderCode("ART-20260814-ABCDEF12");
        order.setStatus(OrderStatus.DELIVERY_FAILED);
        Payment payment = new Payment();
        payment.setTransactionCode("PAY-123");
        PaymentRefund refund = new PaymentRefund();
        refund.setOrder(order);
        refund.setPayment(payment);
        refund.setAmount(new BigDecimal("1119000"));
        refund.setStatus(RefundStatus.PENDING);
        refund.setReason("Giao thất bại");
        return refund;
    }

    @Test
    void settle_marksRefundSuccessfulAndKeepsTheBankReference() {
        PaymentRefund refund = pendingRefund();
        when(paymentRefundRepository.findByIdForUpdate(refundId)).thenReturn(Optional.of(refund));

        var response = paymentRefundService.settle(staffId, refundId,
                new SettleRefundRequest(RefundStatus.SUCCESS, "  BANK-77  ", null));

        assertThat(response.status()).isEqualTo(RefundStatus.SUCCESS);
        assertThat(response.providerRefundId()).isEqualTo("BANK-77");
        assertThat(response.failureMessage()).isNull();
        assertThat(refund.getCompletedAt()).isNotNull();
        verify(orderStatusHistoryService).record(any(), eq(OrderStatus.DELIVERY_FAILED),
                eq(OrderStatus.DELIVERY_FAILED), eq(staffId), any());
    }

    @Test
    void settle_requiresAReasonWhenTheTransferFailed() {
        assertThatThrownBy(() -> paymentRefundService.settle(staffId, refundId,
                new SettleRefundRequest(RefundStatus.FAILED, null, "   ")))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REQUEST);

        // Chưa đọc tới dòng nào thì cũng không được khoá dòng nào.
        verify(paymentRefundRepository, never()).findByIdForUpdate(any());
    }

    @Test
    void settle_refusesToOverwriteARefundSomebodyElseAlreadyClosed() {
        PaymentRefund refund = pendingRefund();
        refund.setStatus(RefundStatus.SUCCESS);
        when(paymentRefundRepository.findByIdForUpdate(refundId)).thenReturn(Optional.of(refund));

        assertThatThrownBy(() -> paymentRefundService.settle(staffId, refundId,
                new SettleRefundRequest(RefundStatus.FAILED, null, "Sai số tài khoản")))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.REFUND_ALREADY_SETTLED);

        assertThat(refund.getStatus()).isEqualTo(RefundStatus.SUCCESS);
        verify(orderStatusHistoryService, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void settle_rejectsPendingAsATargetStateSoRefundsCannotBeReopened() {
        assertThatThrownBy(() -> paymentRefundService.settle(staffId, refundId,
                new SettleRefundRequest(RefundStatus.PENDING, null, null)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REQUEST);
    }
}
