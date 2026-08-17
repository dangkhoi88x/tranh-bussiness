package com.example.businessstore.service;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.entity.Frame;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductSelectionPricingServiceTest {

    @Mock
    private PhotobookPageTierRepository photobookPageTierRepository;

    @InjectMocks
    private ProductSelectionPricingService service;

    @Test
    void quote_usesThePhotobookTierOnceAndAddsTheFrameAdjustment() {
        Product product = pagePricedProduct();
        ProductVariant variant = variant();
        PhotobookPageTier tier = new PhotobookPageTier();
        tier.setPageCount(20);
        tier.setPrice(new BigDecimal("350000"));
        when(photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()))
                .thenReturn(List.of(tier));

        ProductSelectionPricingService.SelectionQuote quote = service.quote(
                product, variant, availableFrameOption("50000"), 20);

        assertThat(quote.pageCount()).isEqualTo(20);
        assertThat(quote.basePrice()).isEqualByComparingTo("350000");
        assertThat(quote.framePriceAdjustment()).isEqualByComparingTo("50000");
        assertThat(quote.unitPrice()).isEqualByComparingTo("400000");
        verify(photobookPageTierRepository).findAllByProductVariantIdOrderByPageCountAsc(variant.getId());
    }

    @Test
    void validateFrameCompatibility_rejectsAFrameOutsideTheVariantDimensions() {
        ProductVariant variant = variant();
        ProductFrameOption option = availableFrameOption("0");
        option.setMinWidthCm(new BigDecimal("31"));

        assertThatThrownBy(() -> service.validateFrameCompatibility(option, variant))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE);
    }

    @Test
    void requireAvailableStock_usesVariantStockWhenVariantIsSelected() {
        Product product = new Product();
        product.setStockQuantity(10);
        ProductVariant variant = variant();
        variant.setStockQuantity(1);

        assertThatThrownBy(() -> service.requireAvailableStock(product, variant, 2))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_PRODUCT_STOCK);
    }

    private Product pagePricedProduct() {
        Product product = new Product();
        product.setMinPages(20);
        product.setMaxPages(40);
        product.setPageStep(2);
        product.setPricePerStep(new BigDecimal("10000"));
        return product;
    }

    private ProductVariant variant() {
        ProductVariant variant = new ProductVariant();
        variant.setId(UUID.randomUUID());
        variant.setWidthCm(new BigDecimal("30"));
        variant.setHeightCm(new BigDecimal("40"));
        variant.setStockQuantity(5);
        return variant;
    }

    private ProductFrameOption availableFrameOption(String adjustment) {
        Frame frame = new Frame();
        frame.setStatus(FrameStatus.ACTIVE);
        ProductFrameOption option = new ProductFrameOption();
        option.setAvailable(true);
        option.setFrame(frame);
        option.setPriceAdjustment(new BigDecimal(adjustment));
        return option;
    }
}
