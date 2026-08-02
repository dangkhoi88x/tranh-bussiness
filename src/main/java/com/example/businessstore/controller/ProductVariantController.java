package com.example.businessstore.controller;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.*;
import com.example.businessstore.service.ProductVariantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/v1/products") @RequiredArgsConstructor
public class ProductVariantController {
    private final ProductVariantService service;
    @GetMapping("/{productId}/variants") public ResponseEntity<ApiResponse<List<ProductVariantResponse>>> published(@PathVariable UUID productId) { return ResponseEntity.ok(ApiResponse.success(service.findPublished(productId))); }
    @GetMapping("/management/{productId}/variants") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<List<ProductVariantResponse>>> all(@PathVariable UUID productId) { return ResponseEntity.ok(ApiResponse.success(service.findAllForManagement(productId))); }
    @PostMapping("/{productId}/variants") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<ProductVariantResponse>> create(@PathVariable UUID productId, @Valid @RequestBody CreateProductVariantRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(productId, request), "Product variant created")); }
    @PutMapping("/{productId}/variants/{variantId}") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<ApiResponse<ProductVariantResponse>> update(@PathVariable UUID productId, @PathVariable UUID variantId, @Valid @RequestBody UpdateProductVariantRequest request) { return ResponseEntity.ok(ApiResponse.success(service.update(productId, variantId, request), "Product variant updated")); }
    @DeleteMapping("/{productId}/variants/{variantId}") @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS) public ResponseEntity<Void> delete(@PathVariable UUID productId, @PathVariable UUID variantId) { service.delete(productId, variantId); return ResponseEntity.noContent().build(); }
}
