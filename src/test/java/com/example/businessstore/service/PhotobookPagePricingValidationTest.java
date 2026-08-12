package com.example.businessstore.service;

import com.example.businessstore.dto.request.SavePhotobookPagePricingRequest;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhotobookPagePricingValidationTest {

    private static final UUID SIZE_S = UUID.randomUUID();
    private static final UUID SIZE_M = UUID.randomUUID();
    private static final List<UUID> VARIANTS = List.of(SIZE_S, SIZE_M);

    private SavePhotobookPagePricingRequest request(Integer minPages, Integer maxPages, Integer pageStep,
                                                    String pricePerStep,
                                                    List<SavePhotobookPagePricingRequest.VariantTiers> variants) {
        return new SavePhotobookPagePricingRequest(minPages, maxPages, pageStep,
                pricePerStep == null ? null : new BigDecimal(pricePerStep), variants);
    }

    private SavePhotobookPagePricingRequest.VariantTiers tiers(UUID variantId, int... pageCounts) {
        List<SavePhotobookPagePricingRequest.Tier> rows = new java.util.ArrayList<>();
        for (int pageCount : pageCounts) {
            rows.add(new SavePhotobookPagePricingRequest.Tier(pageCount, new BigDecimal("1000000")));
        }
        return new SavePhotobookPagePricingRequest.VariantTiers(variantId, rows);
    }

    @Test
    void acceptsAFullyDeclaredPriceTable() {
        assertThatCode(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, 2, "80000", List.of(tiers(SIZE_S, 20, 30), tiers(SIZE_M, 20, 30))), VARIANTS))
                .doesNotThrowAnyException();
    }

    @Test
    void acceptsTurningPagePricingOffWithNoTiers() {
        assertThatCode(() -> PhotobookPagePricingValidation.validate(
                request(null, null, null, null, List.of()), VARIANTS))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsAPartiallyDeclaredConfiguration() {
        // Đúng ràng buộc ck_products_page_pricing: đủ bốn hoặc không trường nào.
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, null, "80000", List.of(tiers(SIZE_S, 20))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }

    @Test
    void rejectsTiersWhenPagePricingIsOff() {
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(null, null, null, null, List.of(tiers(SIZE_S, 20))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }

    @Test
    void rejectsAnchorsOutsideThePageRange() {
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, 2, "80000", List.of(tiers(SIZE_S, 10))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }

    @Test
    void rejectsTheSamePageCountTwiceForOneSize() {
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, 2, "80000", List.of(tiers(SIZE_S, 20, 20))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }

    @Test
    void rejectsASizeThatBelongsToAnotherProduct() {
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, 2, "80000", List.of(tiers(UUID.randomUUID(), 20))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.PRODUCT_VARIANT_NOT_FOUND);
    }

    @Test
    void rejectsAPriceTableWithNoAnchorAtAll() {
        // PhotobookPricing không tính được giá nào khi không có neo, cuốn thành không bán được.
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(20, 150, 2, "80000", List.of(tiers(SIZE_S), tiers(SIZE_M))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }

    @Test
    void rejectsAMaxBelowTheMin() {
        assertThatThrownBy(() -> PhotobookPagePricingValidation.validate(
                request(150, 20, 2, "80000", List.of(tiers(SIZE_S, 20))), VARIANTS))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_PRICING);
    }
}
