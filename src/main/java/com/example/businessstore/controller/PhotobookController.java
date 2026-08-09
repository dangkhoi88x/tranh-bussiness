package com.example.businessstore.controller;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PhotobookPricingResponse;
import com.example.businessstore.service.PhotobookService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class PhotobookController {

    private final PhotobookService photobookService;

    /** Bảng giá theo khổ × số trang; trang chi tiết photobook hiển thị thẳng danh sách này. */
    @GetMapping("/{productId}/photobook-pricing")
    public ResponseEntity<ApiResponse<PhotobookPricingResponse>> pricing(@PathVariable UUID productId) {
        return ResponseEntity.ok(ApiResponse.success(photobookService.getPublishedPricing(productId)));
    }
}
