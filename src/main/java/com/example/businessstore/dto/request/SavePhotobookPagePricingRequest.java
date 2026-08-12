package com.example.businessstore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Ghi đè toàn bộ bảng giá theo trang của một sản phẩm trong một lần.
 *
 * <p>Không tách thành nhiều endpoint nhỏ vì bốn trường cấu hình và các mức neo chỉ có nghĩa khi
 * nhất quán với nhau — ràng buộc {@code ck_products_page_pricing} bắt khai đủ bốn hoặc bỏ trống
 * cả bốn, và một mức neo nằm ngoài khoảng trang thì vô nghĩa. Sửa từng phần sẽ tạo ra những
 * trạng thái trung gian không hợp lệ mà DB từ chối giữa chừng.
 *
 * <p>Bỏ trống cả bốn trường nghĩa là tắt bán theo trang; khi đó {@code variants} phải rỗng.
 */
public record SavePhotobookPagePricingRequest(
        @Min(1) Integer minPages,
        @Min(1) Integer maxPages,
        @Min(1) Integer pageStep,
        @DecimalMin("0") BigDecimal pricePerStep,
        @Valid List<VariantTiers> variants) {

    public record VariantTiers(
            @NotNull UUID variantId,
            @Valid List<Tier> tiers) {
    }

    public record Tier(
            @Min(1) int pageCount,
            @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal price) {
    }
}
