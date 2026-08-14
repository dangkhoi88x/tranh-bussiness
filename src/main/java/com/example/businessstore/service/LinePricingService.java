package com.example.businessstore.service;

import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Nguồn giá gốc duy nhất cho một dòng hàng, trước phụ thu khung và số lượng.
 */
@Service
@RequiredArgsConstructor
public class LinePricingService {

    private final PhotobookPageTierRepository photobookPageTierRepository;

    public BigDecimal basePrice(Product product, ProductVariant variant, Integer pageCount) {
        if (variant == null) {
            return product.getPrice();
        }
        if (product.isPagePriced()) {
            if (pageCount == null) {
                throw new AppException(ErrorCode.PHOTOBOOK_PAGE_COUNT_REQUIRED,
                        "Hãy chọn số trang cho cuốn photobook này.");
            }
            return PhotobookPricing.priceAt(
                    product,
                    photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()),
                    pageCount);
        }
        return variant.getPrice();
    }
}
