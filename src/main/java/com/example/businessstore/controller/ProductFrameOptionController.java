package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateProductFrameOptionRequest;
import com.example.businessstore.dto.request.UpdateProductFrameOptionRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.ProductFrameOptionResponse;
import com.example.businessstore.service.ProductFrameOptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductFrameOptionController {

    private final ProductFrameOptionService productFrameOptionService;

    @GetMapping("/{productId}/frame-options")
    public ResponseEntity<ApiResponse<List<ProductFrameOptionResponse>>> findPublished(@PathVariable UUID productId) {
        return ResponseEntity.ok(ApiResponse.success(productFrameOptionService.findPublishedByProductId(productId)));
    }

    @GetMapping("/{productId}/variants/{variantId}/frame-options")
    public ResponseEntity<ApiResponse<List<ProductFrameOptionResponse>>> findForVariant(@PathVariable UUID productId, @PathVariable UUID variantId) {
        return ResponseEntity.ok(ApiResponse.success(productFrameOptionService.findPublishedByProductVariantId(productId, variantId)));
    }

    @GetMapping("/management/{productId}/frame-options")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<List<ProductFrameOptionResponse>>> findForManagement(@PathVariable UUID productId) {
        return ResponseEntity.ok(ApiResponse.success(productFrameOptionService.findAllForManagement(productId)));
    }

    @PostMapping("/{productId}/frame-options")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<ProductFrameOptionResponse>> create(
            @PathVariable UUID productId,
            @Valid @RequestBody CreateProductFrameOptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(productFrameOptionService.create(productId, request), "Product frame option created"));
    }

    @PutMapping("/{productId}/frame-options/{optionId}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<ProductFrameOptionResponse>> update(
            @PathVariable UUID productId,
            @PathVariable UUID optionId,
            @Valid @RequestBody UpdateProductFrameOptionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                productFrameOptionService.update(productId, optionId, request),
                "Product frame option updated"));
    }

    @DeleteMapping("/{productId}/frame-options/{optionId}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<Void> delete(@PathVariable UUID productId, @PathVariable UUID optionId) {
        productFrameOptionService.delete(productId, optionId);
        return ResponseEntity.noContent().build();
    }
}
