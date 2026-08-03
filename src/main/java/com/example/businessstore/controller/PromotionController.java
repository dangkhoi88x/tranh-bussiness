package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.dto.request.PreviewPromotionRequest;
import com.example.businessstore.dto.request.UpdatePromotionRequest;
import com.example.businessstore.dto.request.UpdatePromotionStatusRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.dto.response.PromotionResponse;
import com.example.businessstore.dto.response.PromotionUsageResponse;
import com.example.businessstore.service.PromotionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;

@RestController
@RequestMapping("/api/v1/promotions")
@RequiredArgsConstructor
public class PromotionController {
    private final PromotionService promotionService;

    @PostMapping("/preview")
    public ResponseEntity<ApiResponse<PromotionCalculationResponse>> preview(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PreviewPromotionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                promotionService.previewCart(userId(jwt), request.couponCode())));
    }

    @GetMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PageResponse<PromotionResponse>>> getAll(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) PromotionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate effectiveTo,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getAll(code, status, effectiveFrom, effectiveTo, page, size)));
    }

    @GetMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PromotionResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getById(id)));
    }

    @GetMapping("/{id}/usages")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PageResponse<PromotionUsageResponse>>> getUsages(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.getUsages(id, page, size)));
    }

    @PostMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PromotionResponse>> create(
            @Valid @RequestBody CreatePromotionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(promotionService.create(request), "Promotion created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PromotionResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePromotionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(promotionService.update(id, request), "Promotion updated"));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<ApiResponse<PromotionResponse>> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePromotionStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                promotionService.updateStatus(id, request.status()), "Promotion status updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PROMOTIONS)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        promotionService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
