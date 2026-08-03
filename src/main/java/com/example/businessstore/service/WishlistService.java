package com.example.businessstore.service;

import com.example.businessstore.dto.request.AddWishlistItemRequest;
import com.example.businessstore.dto.response.WishlistItemResponse;
import com.example.businessstore.dto.response.WishlistResponse;

import java.util.UUID;

public interface WishlistService {
    WishlistResponse getCurrent(UUID userId);
    WishlistItemResponse add(UUID userId, AddWishlistItemRequest request);
    void remove(UUID userId, UUID itemId);
}
