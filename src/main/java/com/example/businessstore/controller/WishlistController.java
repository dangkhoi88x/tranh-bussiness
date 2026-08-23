package com.example.businessstore.controller;

import com.example.businessstore.dto.request.AddWishlistItemRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.WishlistItemResponse;
import com.example.businessstore.dto.response.WishlistResponse;
import com.example.businessstore.service.WishlistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wishlist")
@RequiredArgsConstructor
public class WishlistController {
    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<ApiResponse<WishlistResponse>> getCurrent(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.success(wishlistService.getCurrent(userId(jwt))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WishlistItemResponse>> add(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddWishlistItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(wishlistService.add(userId(jwt), request), "Đã thêm vào danh sách yêu thích."));
    }

    @DeleteMapping("/{itemId}")
    public ResponseEntity<Void> remove(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID itemId) {
        wishlistService.remove(userId(jwt), itemId);
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
