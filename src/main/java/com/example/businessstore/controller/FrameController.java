package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateFrameRequest;
import com.example.businessstore.dto.request.UpdateFrameRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.FrameResponse;
import com.example.businessstore.service.FrameService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/frames")
@RequiredArgsConstructor
public class FrameController {

    private final FrameService frameService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FrameResponse>>> findActive() {
        return ResponseEntity.ok(ApiResponse.success(frameService.findActive()));
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<ApiResponse<FrameResponse>> findActiveBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(frameService.findActiveBySlug(slug)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FrameResponse>> findActiveById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(frameService.findActiveById(id)));
    }

    @GetMapping("/management")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<List<FrameResponse>>> findForManagement() {
        return ResponseEntity.ok(ApiResponse.success(frameService.findAllForManagement()));
    }

    @GetMapping("/management/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<FrameResponse>> findForManagementById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(frameService.findForManagement(id)));
    }

    @PostMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<FrameResponse>> create(@Valid @RequestBody CreateFrameRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(frameService.create(request), "Đã tạo khung tranh."));
    }

    @PutMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<FrameResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateFrameRequest request) {
        return ResponseEntity.ok(ApiResponse.success(frameService.update(id, request), "Đã cập nhật khung tranh."));
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<ApiResponse<FrameResponse>> uploadImage(
            @PathVariable UUID id,
            @RequestPart("file") org.springframework.web.multipart.MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(frameService.uploadImage(id, file), "Đã tải lên ảnh khung tranh."));
    }

    @DeleteMapping("/{id}/image")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<Void> deleteImage(@PathVariable UUID id) {
        frameService.deleteImage(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_FRAMES)
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        frameService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
