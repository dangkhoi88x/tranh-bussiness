package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateCategoryRequest;
import com.example.businessstore.dto.request.UpdateCategoryRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.CategoryResponse;
import com.example.businessstore.service.CategoryService;
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
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CATEGORIES)
    public ResponseEntity<ApiResponse<CategoryResponse>> create(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(categoryService.create(request), "Đã tạo danh mục."));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> findAll() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.findAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CategoryResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.findById(id)));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<CategoryResponse>> findBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.findBySlug(slug)));
    }

    @PutMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CATEGORIES)
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.update(id, request), "Đã cập nhật danh mục."));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_CATEGORIES)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
