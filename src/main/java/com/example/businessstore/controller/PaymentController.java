package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreatePaymentRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PaymentResponse;
import com.example.businessstore.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.time.LocalDate;
import com.example.businessstore.constant.PaymentStatus;
import org.springframework.format.annotation.DateTimeFormat;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    @PostMapping("/orders/{orderId}/payments") public ResponseEntity<ApiResponse<PaymentResponse>> create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId, @Valid @RequestBody CreatePaymentRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(paymentService.create(userId(jwt), orderId, request), "Đã tạo khoản thanh toán.")); }
    @GetMapping("/payments/my-payments") public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(paymentService.getMine(userId(jwt), page, size))); }
    @GetMapping("/payments/my-payments/{id}") public ResponseEntity<ApiResponse<PaymentResponse>> mineById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(paymentService.getMineById(userId(jwt), id))); }
    @GetMapping("/payments") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS) public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> all(@RequestParam(required = false) PaymentStatus status, @RequestParam(required = false) String orderCode, @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdFrom, @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate createdTo, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(paymentService.getAll(status, orderCode, createdFrom, createdTo, page, size))); }
    @PutMapping("/payments/{id}/cod/confirm") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS) public ResponseEntity<ApiResponse<PaymentResponse>> confirmCod(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(paymentService.confirmCod(userId(jwt), id), "Đã xác nhận thu tiền COD.")); }
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
