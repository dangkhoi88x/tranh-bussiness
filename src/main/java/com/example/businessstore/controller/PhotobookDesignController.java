package com.example.businessstore.controller;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PhotobookDesignResponse;
import com.example.businessstore.service.PhotobookDesignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/photobook-designs")
@RequiredArgsConstructor
public class PhotobookDesignController {

    private final PhotobookDesignService photobookDesignService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PhotobookDesignResponse>> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestPart("metadata") String metadataJson,
            @RequestPart(value = "images", required = false) List<MultipartFile> images) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(
                        photobookDesignService.create(userId(jwt), metadataJson, images), "Đã lưu thiết kế."));
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
