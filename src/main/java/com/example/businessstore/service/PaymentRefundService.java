package com.example.businessstore.service;

import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.dto.request.SettleRefundRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentRefundResponse;

import java.util.UUID;

public interface PaymentRefundService {

    PageResponse<PaymentRefundResponse> getAll(RefundStatus status, String orderCode, int page, int size);

    PaymentRefundResponse settle(UUID changedBy, UUID refundId, SettleRefundRequest request);
}
