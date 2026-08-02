package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CheckoutOrderRequest;
import com.example.businessstore.dto.request.UpdateOrderStatusRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.OrderResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.OrderStatusHistoryResponse;
import java.util.List;
import com.example.businessstore.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/v1/orders") @RequiredArgsConstructor
public class OrderController {
    private final OrderService orderService;
    @PostMapping("/checkout") public ResponseEntity<ApiResponse<OrderResponse>> checkout(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CheckoutOrderRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(orderService.checkout(userId(jwt), request), "Order created")); }
    @GetMapping("/my-orders") public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(orderService.getMine(userId(jwt), page, size))); }
    @GetMapping("/my-orders/{id}") public ResponseEntity<ApiResponse<OrderResponse>> mineById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(orderService.getMineById(userId(jwt), id))); }
    @GetMapping("/my-orders/{id}/history") public ResponseEntity<ApiResponse<List<OrderStatusHistoryResponse>>> mineHistory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(orderService.getMineHistory(userId(jwt), id))); }
    @PutMapping("/my-orders/{id}/cancel") public ResponseEntity<ApiResponse<OrderResponse>> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(orderService.cancel(userId(jwt), id), "Order cancelled")); }
    @GetMapping @PreAuthorize(SecurityExpressions.CAN_MANAGE_ORDERS) public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> all(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(orderService.getAll(page, size))); }
    @GetMapping("/{id}") @PreAuthorize(SecurityExpressions.CAN_MANAGE_ORDERS) public ResponseEntity<ApiResponse<OrderResponse>> managementDetail(@PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(orderService.getForManagement(id))); }
    @GetMapping("/{id}/history") @PreAuthorize(SecurityExpressions.CAN_MANAGE_ORDERS) public ResponseEntity<ApiResponse<List<OrderStatusHistoryResponse>>> history(@PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(orderService.getHistoryForManagement(id))); }
    @PutMapping("/{id}/status") @PreAuthorize(SecurityExpressions.CAN_MANAGE_ORDERS) public ResponseEntity<ApiResponse<OrderResponse>> status(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody UpdateOrderStatusRequest request) { return ResponseEntity.ok(ApiResponse.success(orderService.updateStatus(userId(jwt), id, request.status(), request.note()), "Order status updated")); }
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
