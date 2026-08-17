package com.example.businessstore.controller;

import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.SettleRefundRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentRefundResponse;
import com.example.businessstore.service.PaymentRefundService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payment-refunds")
@RequiredArgsConstructor
public class PaymentRefundController {

    private final PaymentRefundService paymentRefundService;

    @GetMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS)
    public ResponseEntity<ApiResponse<PageResponse<PaymentRefundResponse>>> all(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(required = false) String orderCode,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(paymentRefundService.getAll(status, orderCode, page, size)));
    }

    @PutMapping("/{id}/settle")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS)
    public ResponseEntity<ApiResponse<PaymentRefundResponse>> settle(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody SettleRefundRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                paymentRefundService.settle(UUID.fromString(jwt.getSubject()), id, request),
                "Đã cập nhật khoản hoàn tiền."));
    }
}
