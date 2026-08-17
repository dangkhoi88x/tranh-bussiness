package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionScopeType;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.constant.PromotionUsageStatus;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.PromotionScope;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import com.example.businessstore.service.ProductSelectionPricingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionEligibilityServiceTest {

    @Mock
    private PromotionRepository promotionRepository;
    @Mock
    private PromotionUsageRepository usageRepository;
    @Mock
    private CartRepository cartRepository;
    @Mock
    private PhotobookPageTierRepository photobookPageTierRepository;

    private PromotionEligibilityService eligibilityService;

    @BeforeEach
    void setUp() {
        // Dùng service giá thật (không mock) để bài kiểm dưới đây chạy đúng phép tính giá
        // theo số trang, thay vì chỉ kiểm rằng có gọi tới nó.
        eligibilityService = new PromotionEligibilityService(promotionRepository, usageRepository,
                cartRepository, new ProductSelectionPricingService(photobookPageTierRepository));
    }

    @Test
    void previewCart_appliesVariantScopeToBasePriceAndKeepsFrameOutsideDiscount() {
        UUID userId = UUID.randomUUID();
        Category category = new Category();
        category.setId(UUID.randomUUID());
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setCategory(category);
        ProductVariant variant = new ProductVariant();
        variant.setId(UUID.randomUUID());
        variant.setProduct(product);
        variant.setPrice(new BigDecimal("1000"));
        ProductFrameOption frame = new ProductFrameOption();
        frame.setPriceAdjustment(new BigDecimal("200"));
        CartItem item = new CartItem();
        item.setProduct(product);
        item.setProductVariant(variant);
        item.setProductFrameOption(frame);
        item.setQuantity(2);
        Cart cart = new Cart();
        cart.getItems().add(item);

        Promotion promotion = activePromotion(PromotionType.PERCENTAGE, new BigDecimal("10"));
        PromotionScope scope = new PromotionScope();
        scope.setScopeType(PromotionScopeType.VARIANT);
        scope.setProductVariant(variant);
        promotion.addScope(scope);
        promotion.setAppliesToAll(false);

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(promotionRepository.findByCodeIgnoreCase("VARIANT10")).thenReturn(Optional.of(promotion));
        when(usageRepository.countByPromotionIdAndUserIdAndStatusIn(
                promotion.getId(), userId, Set.of(PromotionUsageStatus.RESERVED, PromotionUsageStatus.CONSUMED)))
                .thenReturn(0L);

        PromotionCalculationResponse result = eligibilityService.previewCart(userId, "variant10");

        assertThat(result.subtotalAmount()).isEqualByComparingTo("2400.00");
        assertThat(result.eligibleSubtotal()).isEqualByComparingTo("2000.00");
        assertThat(result.discountAmount()).isEqualByComparingTo("200.00");
        assertThat(result.totalAmount()).isEqualByComparingTo("2200.00");
    }

    @Test
    void previewCart_usesPhotobookPagePriceInsteadOfVariantBasePrice() {
        UUID userId = UUID.randomUUID();
        Category category = new Category();
        category.setId(UUID.randomUUID());
        Product product = new Product();
        product.setId(UUID.randomUUID());
        product.setCategory(category);
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

        CartItem item = new CartItem();
        item.setProduct(product);
        item.setProductVariant(variant);
        item.setPageCount(30);
        item.setQuantity(2);
        Cart cart = new Cart();
        cart.getItems().add(item);

        Promotion promotion = activePromotion(PromotionType.PERCENTAGE, new BigDecimal("10"));
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()))
                .thenReturn(List.of(tier));
        when(promotionRepository.findByCodeIgnoreCase("VARIANT10")).thenReturn(Optional.of(promotion));
        when(usageRepository.countByPromotionIdAndUserIdAndStatusIn(
                promotion.getId(), userId, Set.of(PromotionUsageStatus.RESERVED, PromotionUsageStatus.CONSUMED)))
                .thenReturn(0L);

        PromotionCalculationResponse result = eligibilityService.previewCart(userId, "variant10");

        // Giá theo bậc 30 trang là 1.400.000 chứ không phải giá niêm yết 1.000.000 của variant;
        // lấy nhầm giá variant thì khách được xem trước mức giảm trên một con số không có thật.
        assertThat(result.subtotalAmount()).isEqualByComparingTo("2800000.00");
        assertThat(result.eligibleSubtotal()).isEqualByComparingTo("2800000.00");
        assertThat(result.discountAmount()).isEqualByComparingTo("280000.00");
        assertThat(result.totalAmount()).isEqualByComparingTo("2520000.00");
    }

    private Promotion activePromotion(PromotionType type, BigDecimal discountValue) {
        Promotion promotion = new Promotion();
        promotion.setId(UUID.randomUUID());
        promotion.setCode("VARIANT10");
        promotion.setType(type);
        promotion.setDiscountValue(discountValue);
        promotion.setMinOrderAmount(BigDecimal.ZERO);
        promotion.setStartAt(Instant.now().minusSeconds(60));
        promotion.setEndAt(Instant.now().plusSeconds(3600));
        promotion.setUsageLimit(10);
        promotion.setPerUserLimit(1);
        promotion.setStatus(PromotionStatus.ACTIVE);
        promotion.setAppliesToAll(true);
        return promotion;
    }
}
