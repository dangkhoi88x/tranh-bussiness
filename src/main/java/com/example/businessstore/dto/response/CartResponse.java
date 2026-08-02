package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CartResponse(
        UUID id,
        List<CartItemResponse> items,
        int totalQuantity,
        BigDecimal subtotal) {
}
