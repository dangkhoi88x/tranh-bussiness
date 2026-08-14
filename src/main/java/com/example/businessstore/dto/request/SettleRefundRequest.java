package com.example.businessstore.dto.request;

import com.example.businessstore.constant.RefundStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Hoàn tiền COD là thao tác tay ngoài đời (chuyển khoản hoặc trả tiền mặt), hệ thống chỉ ghi
 * lại kết quả. providerRefundId để dán mã giao dịch ngân hàng cho đối soát về sau.
 */
public record SettleRefundRequest(
        @NotNull RefundStatus status,
        @Size(max = 120) String providerRefundId,
        @Size(max = 1000) String failureMessage) {
}
