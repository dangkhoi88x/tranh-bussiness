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
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
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
    @InjectMocks
    private PromotionEligibilityService eligibilityService;

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
