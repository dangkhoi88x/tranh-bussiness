package com.example.businessstore.dto.response;

import java.util.List;

public record WishlistResponse(List<WishlistItemResponse> items, int totalItems) {
}
