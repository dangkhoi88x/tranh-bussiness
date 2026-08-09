package com.example.businessstore.service;

import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Số liệu lấy nguyên từ bảng giá Eco Matte / Eco Silk của xưởng:
 * 20 trang — S 1.119.000đ, M 1.399.000đ, L 1.599.000đ;
 * 30 trang — S 1.399.000đ, M 1.799.000đ, L 1.999.000đ; và +80.000đ mỗi 2 trang.
 */
class PhotobookPricingTest {

    private static Product photobook() {
        Product product = new Product();
        product.setMinPages(20);
        product.setMaxPages(150);
        product.setPageStep(2);
        product.setPricePerStep(new BigDecimal("80000"));
        return product;
    }

    private static List<PhotobookPageTier> tiers(String priceAt20, String priceAt30) {
        ProductVariant variant = new ProductVariant();
        return List.of(tier(variant, 20, priceAt20), tier(variant, 30, priceAt30));
    }

    private static PhotobookPageTier tier(ProductVariant variant, int pageCount, String price) {
        PhotobookPageTier tier = new PhotobookPageTier();
        tier.setProductVariant(variant);
        tier.setPageCount(pageCount);
        tier.setPrice(new BigDecimal(price));
        return tier;
    }

    @Test
    void priceAt_returnsTheListedPriceOnAnchoredSizes() {
        Product product = photobook();

        assertThat(PhotobookPricing.priceAt(product, tiers("1119000", "1399000"), 20)).isEqualByComparingTo("1119000");
        assertThat(PhotobookPricing.priceAt(product, tiers("1119000", "1399000"), 30)).isEqualByComparingTo("1399000");
        assertThat(PhotobookPricing.priceAt(product, tiers("1399000", "1799000"), 30)).isEqualByComparingTo("1799000");
        assertThat(PhotobookPricing.priceAt(product, tiers("1599000", "1999000"), 30)).isEqualByComparingTo("1999000");
    }

    @Test
    void priceAt_addsTheStepSurchargeAboveTheTopAnchor() {
        Product product = photobook();

        // 40 trang = neo 30 trang + 5 bậc × 80.000đ
        assertThat(PhotobookPricing.priceAt(product, tiers("1119000", "1399000"), 40)).isEqualByComparingTo("1799000");
        assertThat(PhotobookPricing.priceAt(product, tiers("1399000", "1799000"), 32)).isEqualByComparingTo("1879000");
        // Mức trần: 150 trang = neo 30 + 60 bậc
        assertThat(PhotobookPricing.priceAt(product, tiers("1599000", "1999000"), 150)).isEqualByComparingTo("6799000");
    }

    @Test
    void selectablePageCounts_skipsTheGapBetweenAnchorsSoPriceNeverGoesDownAsPagesGoUp() {
        Product product = photobook();
        List<PhotobookPageTier> sizeS = tiers("1119000", "1399000");

        List<Integer> pages = PhotobookPricing.selectablePageCounts(product, sizeS);

        // Khổ S: nội suy 28 trang từ neo 20 sẽ ra 1.439.000đ, đắt hơn cuốn 30 trang 1.399.000đ.
        assertThat(pages).startsWith(20, 30, 32, 34).doesNotContain(22, 24, 26, 28);
        assertThat(pages).last().isEqualTo(150);
        assertThat(pages).isSorted();

        BigDecimal previous = BigDecimal.ZERO;
        for (int page : pages) {
            BigDecimal price = PhotobookPricing.priceAt(product, sizeS, page);
            assertThat(price).as("giá ở %d trang", page).isGreaterThan(previous);
            previous = price;
        }
    }

    @Test
    void priceAt_rejectsPageCountsOutsideTheOfferedList() {
        Product product = photobook();
        List<PhotobookPageTier> sizeS = tiers("1119000", "1399000");

        assertThatThrownBy(() -> PhotobookPricing.priceAt(product, sizeS, 28))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_PHOTOBOOK_PAGE_COUNT));
        assertThatThrownBy(() -> PhotobookPricing.priceAt(product, sizeS, 31))
                .isInstanceOf(AppException.class);
        assertThatThrownBy(() -> PhotobookPricing.priceAt(product, sizeS, 18))
                .isInstanceOf(AppException.class);
        assertThatThrownBy(() -> PhotobookPricing.priceAt(product, sizeS, 152))
                .isInstanceOf(AppException.class);
    }

    @Test
    void nonPhotobookProductsHaveNoPageOptions() {
        Product canvas = new Product();

        assertThat(canvas.isPagePriced()).isFalse();
        assertThat(PhotobookPricing.selectablePageCounts(canvas, List.of())).isEmpty();
        assertThatThrownBy(() -> PhotobookPricing.priceAt(canvas, List.of(), 20))
                .isInstanceOf(AppException.class);
    }
}
