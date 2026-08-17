package com.example.businessstore.service;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/** Centralizes product-selection validation and pricing; callers retain persistence and locking. */
@Service
@RequiredArgsConstructor
public class ProductSelectionPricingService {

    private final PhotobookPageTierRepository photobookPageTierRepository;

    public SelectionQuote quote(
            Product product,
            ProductVariant variant,
            ProductFrameOption frameOption,
            Integer requestedPageCount) {
        List<PhotobookPageTier> pageTiers = product.isPagePriced() && variant != null
                ? pageTiersOf(variant)
                : List.of();
        Integer pageCount = validatePageCount(product, variant, requestedPageCount, pageTiers);
        BigDecimal basePrice = basePrice(product, variant, pageCount, pageTiers);
        BigDecimal framePriceAdjustment = frameOption == null
                ? BigDecimal.ZERO
                : frameOption.getPriceAdjustment();
        return new SelectionQuote(pageCount, basePrice, framePriceAdjustment,
                basePrice.add(framePriceAdjustment));
    }

    public void validateFrameCompatibility(ProductFrameOption option, ProductVariant variant) {
        if (option == null) {
            return;
        }
        if (!option.isAvailable() || option.getFrame().getStatus() != FrameStatus.ACTIVE) {
            throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE,
                    "Khung này hiện không dùng được.");
        }
        if (variant == null) {
            return;
        }
        boolean compatible = (option.getMinWidthCm() == null || variant.getWidthCm().compareTo(option.getMinWidthCm()) >= 0)
                && (option.getMaxWidthCm() == null || variant.getWidthCm().compareTo(option.getMaxWidthCm()) <= 0)
                && (option.getMinHeightCm() == null || variant.getHeightCm().compareTo(option.getMinHeightCm()) >= 0)
                && (option.getMaxHeightCm() == null || variant.getHeightCm().compareTo(option.getMaxHeightCm()) <= 0);
        if (!compatible) {
            throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE,
                    "Khung này không lắp được cho phiên bản đã chọn.");
        }
    }

    public void requireAvailableStock(Product product, ProductVariant variant, int quantity) {
        int availableStock = variant == null ? product.getStockQuantity() : variant.getStockQuantity();
        if (quantity > availableStock) {
            throw new AppException(ErrorCode.INSUFFICIENT_PRODUCT_STOCK,
                    "Số lượng bạn chọn vượt quá hàng còn lại.");
        }
    }

    private Integer validatePageCount(
            Product product,
            ProductVariant variant,
            Integer requestedPageCount,
            List<PhotobookPageTier> pageTiers) {
        if (!product.isPagePriced()) {
            if (requestedPageCount != null) {
                throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_COUNT,
                        "Sản phẩm này không bán theo số trang.");
            }
            return null;
        }
        if (variant == null) {
            throw new AppException(ErrorCode.PRODUCT_VARIANT_REQUIRED,
                    "Hãy chọn khổ photobook trước khi thêm vào giỏ.");
        }
        if (requestedPageCount == null) {
            throw new AppException(ErrorCode.PHOTOBOOK_PAGE_COUNT_REQUIRED,
                    "Hãy chọn số trang cho cuốn photobook này.");
        }
        PhotobookPricing.priceAt(product, pageTiers, requestedPageCount);
        return requestedPageCount;
    }

    private BigDecimal basePrice(
            Product product,
            ProductVariant variant,
            Integer pageCount,
            List<PhotobookPageTier> pageTiers) {
        if (variant == null) {
            return product.getPrice();
        }
        if (pageCount != null) {
            return PhotobookPricing.priceAt(product, pageTiers, pageCount);
        }
        return variant.getPrice();
    }

    private List<PhotobookPageTier> pageTiersOf(ProductVariant variant) {
        return photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId());
    }

    public record SelectionQuote(
            Integer pageCount,
            BigDecimal basePrice,
            BigDecimal framePriceAdjustment,
            BigDecimal unitPrice) {
    }
}
