package com.example.businessstore.controller;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.SharePreviewResponse;
import com.example.businessstore.service.PhotobookSharePreviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/photobook-share-previews")
@RequiredArgsConstructor
public class PhotobookSharePreviewController {

    private final PhotobookSharePreviewService sharePreviewService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SharePreviewResponse>> create(
            @RequestPart("metadata") String metadataJson,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(sharePreviewService.create(metadataJson, images), "Đã tạo liên kết xem trước."));
    }

    @GetMapping("/{token}")
    public ResponseEntity<ApiResponse<SharePreviewResponse>> getByToken(@PathVariable String token) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(sharePreviewService.getByToken(token)));
    }
}
