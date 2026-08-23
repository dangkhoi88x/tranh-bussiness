package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Bảng giá theo trang của một photobook, dựng cho màn quản trị.
 *
 * <p>{@code selectable} là kết quả chạy thật {@link com.example.businessstore.service.PhotobookPricing}
 * trên cấu hình hiện tại — đúng danh sách mức trang và giá mà khách sẽ thấy. Trả kèm ở đây để
 * người nhập giá đối chiếu ngay được với bảng giá của xưởng, thay vì phải suy ra trong đầu quy
 * tắc "neo cộng phụ thu mỗi bậc, chỉ áp cho phần vượt trên neo cao nhất".
 */
public record PhotobookPagePricingResponse(
        UUID productId,
        boolean pagePriced,
        Integer minPages,
        Integer maxPages,
        Integer pageStep,
        BigDecimal pricePerStep,
        List<VariantPricing> variants) {

    public record VariantPricing(
            UUID variantId,
            String sku,
            String name,
            List<Tier> tiers,
            List<SelectablePage> selectable) {
    }

    /** Giá niêm yết cứng tại một mức trang — không suy ra được bằng công thức. */
    public record Tier(int pageCount, BigDecimal price) {
    }

    public record SelectablePage(int pageCount, BigDecimal price) {
    }
}
