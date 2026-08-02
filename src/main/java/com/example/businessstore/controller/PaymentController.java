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

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class PaymentController {
    private final PaymentService paymentService;
    @PostMapping("/orders/{orderId}/payments") public ResponseEntity<ApiResponse<PaymentResponse>> create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId, @Valid @RequestBody CreatePaymentRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(paymentService.create(userId(jwt), orderId, request), "Payment created")); }
    @GetMapping("/payments/my-payments") public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(paymentService.getMine(userId(jwt), page, size))); }
    @GetMapping("/payments/my-payments/{id}") public ResponseEntity<ApiResponse<PaymentResponse>> mineById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(paymentService.getMineById(userId(jwt), id))); }
    @GetMapping("/payments") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS) public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> all(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(paymentService.getAll(page, size))); }
    @PutMapping("/payments/{id}/cod/confirm") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PAYMENTS) public ResponseEntity<ApiResponse<PaymentResponse>> confirmCod(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(paymentService.confirmCod(userId(jwt), id), "COD payment confirmed")); }
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
