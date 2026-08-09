package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.UUID;

public record CartItemResponse(
        UUID id,
        UUID productId,
        String productName,
        String productSlug,
        ProductVariantResponse selectedVariant,
        BigDecimal basePrice,
        ProductFrameOptionResponse selectedFrameOption,
        /** Số trang photobook đã chọn; null với sản phẩm không bán theo trang. */
        Integer pageCount,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal) {
}
