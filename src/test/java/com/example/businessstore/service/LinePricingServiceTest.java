package com.example.businessstore.service;

import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LinePricingServiceTest {

    private final PhotobookPageTierRepository tierRepository = mock(PhotobookPageTierRepository.class);
    private final LinePricingService pricingService = new LinePricingService(tierRepository);

    @Test
    void basePrice_usesPageTierForPagePricedProduct() {
        Product product = new Product();
        product.setMinPages(20);
        product.setMaxPages(150);
        product.setPageStep(2);
        product.setPricePerStep(new BigDecimal("40000"));
        ProductVariant variant = new ProductVariant();
        variant.setId(UUID.randomUUID());
        variant.setProduct(product);
        variant.setPrice(new BigDecimal("1000000"));
        PhotobookPageTier tier = new PhotobookPageTier();
        tier.setProductVariant(variant);
        tier.setPageCount(30);
        tier.setPrice(new BigDecimal("1400000"));
        when(tierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()))
                .thenReturn(List.of(tier));

        BigDecimal result = pricingService.basePrice(product, variant, 30);

        assertThat(result).isEqualByComparingTo("1400000");
    }

    @Test
    void basePrice_usesVariantPriceForRegularProduct() {
        Product product = new Product();
        ProductVariant variant = new ProductVariant();
        variant.setPrice(new BigDecimal("350000"));

        assertThat(pricingService.basePrice(product, variant, null))
                .isEqualByComparingTo("350000");
    }
}
