package com.example.businessstore.controller;

import com.example.businessstore.constant.ProductCatalogSort;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.constant.ProductStockLevel;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateProductRequest;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.dto.request.SavePhotobookPagePricingRequest;
import com.example.businessstore.dto.request.UpdateProductRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PhotobookPagePricingResponse;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.service.PhotobookPagePricingService;
import com.example.businessstore.service.ProductService;
import com.example.businessstore.service.MaterialService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final MaterialService materialService;
    private final PhotobookPagePricingService photobookPagePricingService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> findPublished(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) UUID materialId,
            @RequestParam(required = false) BigDecimal widthCm,
            @RequestParam(required = false) BigDecimal heightCm,
            @RequestParam(defaultValue = "NEWEST") ProductCatalogSort sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        ProductCatalogFilter filter = new ProductCatalogFilter(
                categoryId, keyword, minPrice, maxPrice, materialId == null ? material : materialService.requireActiveArtworkSurface(materialId).getName(), widthCm, heightCm, sort);
        return ResponseEntity.ok(ApiResponse.success(productService.findPublished(filter, page, size)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<ProductResponse>> findPublishedBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(productService.findPublishedBySlug(slug)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> findPublishedById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(productService.findPublishedById(id)));
    }

    @GetMapping("/management")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> findForManagement(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) ProductStatus status,
            @RequestParam(required = false) String variantSku,
            @RequestParam(required = false) String material,
            @RequestParam(required = false) UUID materialId,
            @RequestParam(required = false) ProductStockLevel effectiveStockLevel,
            @RequestParam(required = false) ProductStockLevel stockLevel,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        ProductStockLevel requestedStockLevel = effectiveStockLevel == null ? stockLevel : effectiveStockLevel;
        return ResponseEntity.ok(ApiResponse.success(productService.findAllForManagement(
                categoryId, name, status, variantSku, materialId == null ? material : materialService.requireActiveArtworkSurface(materialId).getName(), requestedStockLevel, minPrice, maxPrice, page, size)));
    }

    @GetMapping("/management/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<ProductResponse>> findForManagementById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(productService.findForManagement(id)));
    }

    /** Bảng giá theo trang: bốn trường cấu hình cộng các mức niêm yết của từng khổ. */
    @GetMapping("/management/{id}/page-pricing")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<PhotobookPagePricingResponse>> pagePricing(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(photobookPagePricingService.get(id)));
    }

    @PutMapping("/{id}/page-pricing")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<PhotobookPagePricingResponse>> savePagePricing(
            @PathVariable UUID id,
            @Valid @RequestBody SavePhotobookPagePricingRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(photobookPagePricingService.save(id, request), "Page pricing updated"));
    }

    @PostMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<ProductResponse>> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(productService.create(request), "Product created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProductRequest request) {
        return ResponseEntity.ok(ApiResponse.success(productService.update(id, request), "Product updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        productService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
