package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Bảng giá photobook cho một khổ sách: các mức trang bán được kèm giá tương ứng.
 * Frontend hiển thị thẳng danh sách này thay vì tự tính, để giá trên trang luôn khớp
 * với giá backend chốt lúc đặt đơn.
 */
public record PhotobookPricingResponse(
        UUID productId,
        int minPages,
        int maxPages,
        int pageStep,
        BigDecimal pricePerStep,
        List<Size> sizes) {

    public record Size(
            UUID variantId,
            String sku,
            String name,
            BigDecimal widthCm,
            BigDecimal heightCm,
            boolean available,
            List<PageOption> pageOptions) {
    }

    public record PageOption(int pageCount, BigDecimal price) {
    }
}
