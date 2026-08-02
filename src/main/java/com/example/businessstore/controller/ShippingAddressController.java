package com.example.businessstore.controller;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.*;
import com.example.businessstore.service.ShippingAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/v1/shipping-addresses") @RequiredArgsConstructor
public class ShippingAddressController {
    private final ShippingAddressService service;
    @PostMapping public ResponseEntity<ApiResponse<ShippingAddressResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateShippingAddressRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(userId(jwt), request), "Shipping address created")); }
    @GetMapping public ResponseEntity<ApiResponse<List<ShippingAddressResponse>>> mine(@AuthenticationPrincipal Jwt jwt) { return ResponseEntity.ok(ApiResponse.success(service.getMine(userId(jwt)))); }
    @PutMapping("/{id}") public ResponseEntity<ApiResponse<ShippingAddressResponse>> update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody UpdateShippingAddressRequest request) { return ResponseEntity.ok(ApiResponse.success(service.update(userId(jwt), id, request), "Shipping address updated")); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { service.delete(userId(jwt), id); return ResponseEntity.noContent().build(); }
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
