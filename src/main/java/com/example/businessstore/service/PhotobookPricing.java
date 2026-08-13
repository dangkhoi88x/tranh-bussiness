package com.example.businessstore.service;

import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

/**
 * Giá một cuốn photobook theo khổ (variant) và số trang.
 *
 * <p>Bảng giá của xưởng neo giá cứng ở các mức niêm yết — 20 và 30 trang — và khổ S không
 * suy ra được từ khổ khác: chênh lệch 20→30 trang của S là 280.000đ trong khi M và L đều là
 * 400.000đ (= 5 bậc × 80.000đ). Vì vậy mỗi mức niêm yết là một {@link PhotobookPageTier},
 * còn {@code pricePerStep} chỉ áp cho phần vượt trên neo cao nhất.
 *
 * <p>Hệ quả: các mức trang <em>giữa</em> hai neo không được bán. Nếu tính 28 trang khổ S bằng
 * neo 20 cộng 4 bậc sẽ ra 1.439.000đ — đắt hơn cuốn 30 trang (1.399.000đ), tức khách trả nhiều
 * tiền hơn để lấy ít trang hơn. Muốn mở bán các mức đó thì thêm neo cho chúng, đừng nội suy.
 */
public final class PhotobookPricing {

    private PhotobookPricing() {
    }

    /**
     * Các mức trang bán được, tăng dần: đúng các mức đã neo, cộng thêm mỗi bậc phía trên
     * neo cao nhất cho tới {@code maxPages}.
     */
    public static List<Integer> selectablePageCounts(Product product, List<PhotobookPageTier> tiers) {
        if (!product.isPagePriced() || tiers.isEmpty()) {
            return List.of();
        }
        List<Integer> anchors = tiers.stream().map(PhotobookPageTier::getPageCount).sorted().toList();
        int top = anchors.getLast();
        List<Integer> pages = new java.util.ArrayList<>(anchors);
        for (int page = top + product.getPageStep(); page <= product.getMaxPages(); page += product.getPageStep()) {
            pages.add(page);
        }
        return List.copyOf(pages);
    }

    /**
     * Giá cuốn sách ở số trang đã chọn, chưa cộng phụ thu khung/bìa.
     *
     * @throws AppException nếu số trang không nằm trong danh sách bán được — nơi gọi phải
     *                      dùng đúng hàm này thay vì tự nội suy, để giỏ hàng và lúc đặt đơn
     *                      không bao giờ lệch giá nhau.
     */
    public static BigDecimal priceAt(Product product, List<PhotobookPageTier> tiers, int pageCount) {
        if (!product.isPagePriced() || tiers.isEmpty()) {
            throw new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE, "Sản phẩm này không bán theo số trang.");
        }
        if (!selectablePageCounts(product, tiers).contains(pageCount)) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_COUNT,
                    "Cuốn photobook này không có mức " + pageCount + " trang.");
        }
        PhotobookPageTier anchor = tiers.stream()
                .filter(tier -> tier.getPageCount() <= pageCount)
                .max(Comparator.comparingInt(PhotobookPageTier::getPageCount))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_COUNT,
                        "Số trang " + pageCount + " thấp hơn mức nhỏ nhất đang niêm yết."));

        int steps = (pageCount - anchor.getPageCount()) / product.getPageStep();
        return anchor.getPrice().add(product.getPricePerStep().multiply(BigDecimal.valueOf(steps)));
    }
}
