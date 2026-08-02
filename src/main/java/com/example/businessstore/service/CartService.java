package com.example.businessstore.service;

import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.request.UpdateCartItemRequest;
import com.example.businessstore.dto.response.CartResponse;

import java.util.UUID;

public interface CartService {

    CartResponse getCurrentCart(UUID userId);

    CartResponse addItem(UUID userId, AddCartItemRequest request);

    CartResponse updateItem(UUID userId, UUID itemId, UpdateCartItemRequest request);

    void removeItem(UUID userId, UUID itemId);

    void clear(UUID userId);
}
