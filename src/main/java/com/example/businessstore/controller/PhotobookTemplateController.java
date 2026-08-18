package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.SavePhotobookTemplateRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PhotobookTemplateResponse;
import com.example.businessstore.service.PhotobookTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Thư viện chủ đề photobook. Chỉnh sửa gộp vào quyền PRODUCT_MANAGE như khổ tranh và chất liệu:
 * đây cũng là dữ liệu tham chiếu của catalog, không phải thao tác trên đơn hàng của khách.
 */
@RestController
@RequestMapping("/api/v1/photobook-templates")
@RequiredArgsConstructor
public class PhotobookTemplateController {

    private final PhotobookTemplateService photobookTemplateService;

    /**
     * Công khai: trang sản phẩm dựng danh sách chủ đề cho khách chọn từ đây.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotobookTemplateResponse>>> active() {
        return ResponseEntity.ok(ApiResponse.success(photobookTemplateService.findActive()));
    }

    @GetMapping("/management")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<List<PhotobookTemplateResponse>>> all() {
        return ResponseEntity.ok(ApiResponse.success(photobookTemplateService.findAllForManagement()));
    }

    @PostMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<PhotobookTemplateResponse>> create(
            @Valid @RequestBody SavePhotobookTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(photobookTemplateService.create(request), "Đã tạo mẫu photobook."));
    }

    @PutMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_PRODUCTS)
    public ResponseEntity<ApiResponse<PhotobookTemplateResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody SavePhotobookTemplateRequest request) {
        return ResponseEntity.ok(
                ApiResponse.success(photobookTemplateService.update(id, request), "Đã cập nhật mẫu photobook."));
    }
}
