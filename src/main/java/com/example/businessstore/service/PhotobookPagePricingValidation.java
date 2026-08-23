package com.example.businessstore.service;

import com.example.businessstore.dto.request.SavePhotobookPagePricingRequest;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Kiểm tra một bảng giá theo trang trước khi ghi. Tách thành hàm thuần để chạy được mà không cần
 * DB — cùng lý do như {@link PhotobookPricing}, và vì đây là nơi duy nhất diễn giải ràng buộc
 * {@code ck_products_page_pricing} thành thông báo mà người nhập giá hiểu được, thay vì để
 * Postgres ném ra lỗi constraint thô.
 */
public final class PhotobookPagePricingValidation {

    private PhotobookPagePricingValidation() {
    }

    public static void validate(SavePhotobookPagePricingRequest request, Collection<UUID> productVariantIds) {
        List<SavePhotobookPagePricingRequest.VariantTiers> variants =
                request.variants() == null ? List.of() : request.variants();

        int declared = count(request.minPages(), request.maxPages(), request.pageStep(), request.pricePerStep());
        if (declared > 0 && declared < 4) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                    "Khai đủ cả bốn trường (trang tối thiểu, tối đa, bước trang, phụ thu mỗi bậc) hoặc bỏ trống cả bốn");
        }

        boolean pagePriced = declared == 4;
        if (!pagePriced) {
            boolean hasTiers = variants.stream().anyMatch(entry -> !tiersOf(entry).isEmpty());
            if (hasTiers) {
                throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                        "Sản phẩm không bán theo trang thì không giữ được mức giá niêm yết nào");
            }
            return;
        }

        if (request.maxPages() < request.minPages()) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                    "Số trang tối đa phải lớn hơn hoặc bằng số trang tối thiểu");
        }

        Set<UUID> seenVariants = new HashSet<>();
        int totalTiers = 0;
        for (SavePhotobookPagePricingRequest.VariantTiers entry : variants) {
            if (!productVariantIds.contains(entry.variantId())) {
                throw new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
                        "Khổ " + entry.variantId() + " không thuộc sản phẩm này");
            }
            if (!seenVariants.add(entry.variantId())) {
                throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                        "Mỗi khổ chỉ được gửi lên một lần");
            }
            Set<Integer> seenPages = new HashSet<>();
            for (SavePhotobookPagePricingRequest.Tier tier : tiersOf(entry)) {
                if (tier.pageCount() < request.minPages() || tier.pageCount() > request.maxPages()) {
                    throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                            "Mức " + tier.pageCount() + " trang nằm ngoài khoảng "
                                    + request.minPages() + "–" + request.maxPages() + " trang");
                }
                if (!seenPages.add(tier.pageCount())) {
                    throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                            "Mức " + tier.pageCount() + " trang bị khai hai lần cho cùng một khổ");
                }
                totalTiers++;
            }
        }

        // Không có neo nào thì PhotobookPricing không tính được giá cho bất kỳ mức trang nào và
        // sản phẩm coi như không bán được — chặn ở đây thay vì để khách gặp lỗi lúc thêm vào giỏ.
        if (totalTiers == 0) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING,
                    "Cần ít nhất một mức giá niêm yết, nếu không khách không mua được cuốn nào");
        }
    }

    private static List<SavePhotobookPagePricingRequest.Tier> tiersOf(SavePhotobookPagePricingRequest.VariantTiers entry) {
        return entry.tiers() == null ? List.of() : entry.tiers();
    }

    private static int count(Object... values) {
        int present = 0;
        for (Object value : values) {
            if (value != null) present++;
        }
        return present;
    }
}
