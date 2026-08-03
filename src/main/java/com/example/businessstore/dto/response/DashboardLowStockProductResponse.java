package com.example.businessstore.dto.response;

import java.util.UUID;

public record DashboardLowStockProductResponse(UUID id, String name, String categoryName, int stockQuantity) {
}
