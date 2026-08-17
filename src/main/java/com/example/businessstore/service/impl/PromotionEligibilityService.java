package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionScopeType;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.constant.PromotionUsageStatus;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.PromotionScope;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import com.example.businessstore.service.ProductSelectionPricingService;
import com.example.businessstore.service.PromotionLine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Evaluates applicability and calculates a promotion without reserving its quota. */
@Service
@RequiredArgsConstructor
public class PromotionEligibilityService {

    private static final Set<PromotionUsageStatus> ACTIVE_USAGE_STATUSES =
            Set.of(PromotionUsageStatus.RESERVED, PromotionUsageStatus.CONSUMED);

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final CartRepository cartRepository;
    private final ProductSelectionPricingService selectionPricingService;

    @Transactional(readOnly = true)
    public PromotionCalculationResponse previewCart(UUID userId, String couponCode) {
        Cart cart = cartRepository.findByUserId(userId)
                .filter(current -> !current.getItems().isEmpty())
                .orElseThrow(() -> new AppException(ErrorCode.CART_EMPTY, "Giỏ hàng đang trống."));
        BigDecimal subtotal = BigDecimal.ZERO;
        List<PromotionLine> lines = new java.util.ArrayList<>();
        for (CartItem item : cart.getItems()) {
            ProductVariant variant = item.getProductVariant();
            // Phải đi qua đúng nguồn giá của giỏ và checkout. Lấy thẳng variant.getPrice() sẽ
            // bỏ qua giá theo số trang, nên photobook được xem trước mức giảm trên một mức giá
            // không phải mức khách thực trả.
            BigDecimal basePrice = selectionPricingService.basePrice(
                    item.getProduct(), variant, item.getPageCount());
            BigDecimal framePrice = item.getProductFrameOption() == null
                    ? BigDecimal.ZERO
                    : item.getProductFrameOption().getPriceAdjustment();
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
            subtotal = subtotal.add(basePrice.add(framePrice).multiply(quantity));
            lines.add(new PromotionLine(item.getProduct().getCategory().getId(), item.getProduct().getId(),
                    variant == null ? null : variant.getId(), basePrice.multiply(quantity)));
        }
        Promotion promotion = findActivePromotion(couponCode, Instant.now());
        ensureUserLimit(promotion, userId);
        ensureQuotaAvailable(promotion);
        return calculate(promotion, money(subtotal), lines, null);
    }

    public Promotion findActivePromotion(String couponCode, Instant now) {
        Promotion promotion = promotionRepository.findByCodeIgnoreCase(normalizeCode(couponCode))
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND,
                        "Không tìm thấy chương trình khuyến mãi."));
        if (promotion.getStatus() != PromotionStatus.ACTIVE) {
            throw new AppException(ErrorCode.PROMOTION_NOT_ACTIVE, "Mã khuyến mãi hiện không được áp dụng.");
        }
        if (now.isBefore(promotion.getStartAt()) || !now.isBefore(promotion.getEndAt())) {
            throw new AppException(ErrorCode.PROMOTION_EXPIRED,
                    "Mã khuyến mãi không nằm trong thời gian áp dụng.");
        }
        return promotion;
    }

    public void ensureUserLimit(Promotion promotion, UUID userId) {
        if (promotion.getPerUserLimit() == 0) {
            return;
        }
        long usages = usageRepository.countByPromotionIdAndUserIdAndStatusIn(
                promotion.getId(), userId, ACTIVE_USAGE_STATUSES);
        if (usages >= promotion.getPerUserLimit()) {
            throw new AppException(ErrorCode.PROMOTION_USER_LIMIT_REACHED,
                    "Bạn đã dùng hết số lượt cho phép của mã này.");
        }
    }

    public PromotionCalculationResponse calculate(
            Promotion promotion,
            BigDecimal subtotal,
            List<PromotionLine> lines,
            Instant expiresAt) {
        BigDecimal eligibleSubtotal = lines.stream()
                .filter(line -> appliesTo(promotion, line))
                .map(PromotionLine::eligibleAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        eligibleSubtotal = money(eligibleSubtotal);
        if (eligibleSubtotal.signum() <= 0) {
            throw new AppException(ErrorCode.PROMOTION_NOT_APPLICABLE,
                    "Mã khuyến mãi không áp dụng cho sản phẩm nào trong giỏ.");
        }
        if (eligibleSubtotal.compareTo(promotion.getMinOrderAmount()) < 0) {
            throw new AppException(ErrorCode.PROMOTION_MIN_ORDER_NOT_MET,
                    "Giá trị hàng đủ điều kiện chưa đạt mức tối thiểu của mã.");
        }
        BigDecimal discount = switch (promotion.getType()) {
            case PERCENTAGE -> eligibleSubtotal.multiply(promotion.getDiscountValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case FIXED_AMOUNT -> promotion.getDiscountValue();
        };
        if (promotion.getMaxDiscountAmount() != null) {
            discount = discount.min(promotion.getMaxDiscountAmount());
        }
        discount = money(discount.min(eligibleSubtotal).max(BigDecimal.ZERO));
        return new PromotionCalculationResponse(promotion.getId(), promotion.getCode(), promotion.getType(),
                subtotal, eligibleSubtotal, discount, money(subtotal.subtract(discount)), expiresAt);
    }

    BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private void ensureQuotaAvailable(Promotion promotion) {
        if (promotion.getUsageLimit() > 0
                && promotion.getReservedCount() + promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED, "Mã khuyến mãi đã hết lượt sử dụng.");
        }
    }

    private boolean appliesTo(Promotion promotion, PromotionLine line) {
        if (promotion.isAppliesToAll()) {
            return true;
        }
        if (promotion.getScopes().isEmpty()) {
            return false;
        }
        return promotion.getScopes().stream().anyMatch(scope -> appliesTo(scope, line));
    }

    private boolean appliesTo(PromotionScope scope, PromotionLine line) {
        return switch (scope.getScopeType()) {
            case CATEGORY -> scope.getCategory().getId().equals(line.categoryId());
            case PRODUCT -> scope.getProduct().getId().equals(line.productId());
            case VARIANT -> line.productVariantId() != null
                    && scope.getProductVariant().getId().equals(line.productVariantId());
        };
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(java.util.Locale.ROOT);
    }
}
