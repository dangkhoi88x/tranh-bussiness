package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AddCartItemRequest(
        @NotNull UUID productId,
        UUID productVariantId,
        UUID productFrameOptionId,
        /** Bắt buộc với photobook (sản phẩm bán theo trang), phải bỏ trống với sản phẩm khác. */
        @Min(1) Integer pageCount,
        /** Bản thiết kế đã chốt trước khi thêm vào giỏ; tuỳ chọn — thiếu thì dùng luồng gửi ảnh thủ công sau khi mua. */
        UUID photobookDesignId,
        /** Mẫu khách chọn ở trang sản phẩm; tuỳ chọn — bỏ trống thì xưởng dựng theo mẫu mặc định. */
        @Size(max = 40) String photobookTemplateCode,
        @NotNull @Min(1) @Max(999) Integer quantity) {
}
