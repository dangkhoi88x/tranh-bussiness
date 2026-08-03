package com.example.businessstore.controller;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.constant.ShipmentStatus;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.*;
import com.example.businessstore.service.ShipmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class ShipmentController {
    private final ShipmentService service;
    @PostMapping("/orders/{orderId}/shipment") @PreAuthorize(SecurityExpressions.CAN_MANAGE_SHIPMENTS) public ResponseEntity<ApiResponse<ShipmentResponse>> create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId, @Valid @RequestBody CreateShipmentRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(UUID.fromString(jwt.getSubject()), orderId, request), "Shipment created")); }
    @GetMapping("/orders/my-orders/{orderId}/shipment") public ResponseEntity<ApiResponse<ShipmentResponse>> mine(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId) { return ResponseEntity.ok(ApiResponse.success(service.getMine(UUID.fromString(jwt.getSubject()), orderId))); }
    @GetMapping("/orders/{orderId}/shipment") @PreAuthorize(SecurityExpressions.CAN_MANAGE_SHIPMENTS) public ResponseEntity<ApiResponse<ShipmentResponse>> management(@PathVariable UUID orderId) { return ResponseEntity.ok(ApiResponse.success(service.getForManagement(orderId))); }
    @GetMapping("/shipments") @PreAuthorize(SecurityExpressions.CAN_MANAGE_SHIPMENTS) public ResponseEntity<ApiResponse<PageResponse<ShipmentResponse>>> all(@RequestParam(required = false) ShipmentStatus status, @RequestParam(required = false) String carrier, @RequestParam(required = false) String trackingCode, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "20") int size) { return ResponseEntity.ok(ApiResponse.success(service.getAll(status, carrier, trackingCode, page, size))); }
    @PutMapping("/shipments/{id}/status") @PreAuthorize(SecurityExpressions.CAN_MANAGE_SHIPMENTS) public ResponseEntity<ApiResponse<ShipmentResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody UpdateShipmentStatusRequest request) { return ResponseEntity.ok(ApiResponse.success(service.updateStatus(UUID.fromString(jwt.getSubject()), id, request), "Shipment updated")); }
}
