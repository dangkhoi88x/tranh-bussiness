package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.UpdateProductImageRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.ProductImageResponse;
import com.example.businessstore.service.ProductImageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductImageController {

    private final ProductImageService productImageService;

    @GetMapping("/{productId}/images")
    public ResponseEntity<ApiResponse<List<ProductImageResponse>>> findPublished(@PathVariable UUID productId) {
        return ResponseEntity.ok(ApiResponse.success(productImageService.findPublishedByProductId(productId)));
    }

    @GetMapping("/management/{productId}/images")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<List<ProductImageResponse>>> findForManagement(@PathVariable UUID productId) {
        return ResponseEntity.ok(ApiResponse.success(productImageService.findAllForManagement(productId)));
    }

    @PostMapping(value = "/{productId}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<ProductImageResponse>> upload(
            @PathVariable UUID productId,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(required = false) String altText) {
        return ResponseEntity.ok(ApiResponse.success(productImageService.upload(productId, file, altText), "Image uploaded"));
    }

    @PatchMapping("/{productId}/images/{imageId}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<ProductImageResponse>> update(
            @PathVariable UUID productId,
            @PathVariable UUID imageId,
            @Valid @org.springframework.web.bind.annotation.RequestBody UpdateProductImageRequest request) {
        return ResponseEntity.ok(ApiResponse.success(productImageService.update(productId, imageId, request), "Image updated"));
    }

    @DeleteMapping("/{productId}/images/{imageId}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<Void> delete(@PathVariable UUID productId, @PathVariable UUID imageId) {
        productImageService.delete(productId, imageId);
        return ResponseEntity.noContent().build();
    }
}
