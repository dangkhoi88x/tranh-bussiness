package com.example.businessstore.controller;

import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.request.UpdateCartItemRequest;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.CartResponse;
import com.example.businessstore.service.CartService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCurrentCart(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(ApiResponse.success(cartService.getCurrentCart(userId(jwt))));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addItem(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(cartService.addItem(userId(jwt), request), "Item added to cart"));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItem(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(cartService.updateItem(userId(jwt), itemId, request), "Cart item updated"));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> removeItem(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID itemId) {
        cartService.removeItem(userId(jwt), itemId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> clear(@AuthenticationPrincipal Jwt jwt) {
        cartService.clear(userId(jwt));
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
