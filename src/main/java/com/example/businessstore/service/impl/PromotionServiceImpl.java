package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionScopeType;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.constant.PromotionUsageStatus;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.dto.request.PromotionScopeRequest;
import com.example.businessstore.dto.request.UpdatePromotionRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PromotionCalculationResponse;
import com.example.businessstore.dto.response.PromotionResponse;
import com.example.businessstore.dto.response.PromotionScopeResponse;
import com.example.businessstore.dto.response.PromotionUsageResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.PromotionScope;
import com.example.businessstore.entity.PromotionUsage;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.PromotionLine;
import com.example.businessstore.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PromotionServiceImpl implements PromotionService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<PromotionUsageStatus> ACTIVE_USAGE_STATUSES =
            Set.of(PromotionUsageStatus.RESERVED, PromotionUsageStatus.CONSUMED);

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final UserRepository userRepository;
    private final CartRepository cartRepository;

    @Value("${app.promotion.reservation-ttl:PT30M}")
    private Duration reservationTtl;

    @Override
    @Transactional
    public PromotionResponse create(CreatePromotionRequest request) {
        validateDefinition(request.type(), request.discountValue(), request.startAt(), request.endAt());
        String code = normalizeCode(request.code());
        if (promotionRepository.existsByCodeIgnoreCase(code)) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS, "Mã khuyến mãi này đã tồn tại.");
        }
        Promotion promotion = new Promotion();
        applyDefinition(promotion, request.name(), code, request.description(), request.type(),
                request.discountValue(), request.maxDiscountAmount(), request.minOrderAmount(),
                request.startAt(), request.endAt(), request.usageLimit(), request.perUserLimit());
        promotion.setReservedCount(0);
        promotion.setUsedCount(0);
        promotion.setStatus(PromotionStatus.DRAFT);
        replaceScopes(promotion, request.scopes());
        try {
            return toResponse(promotionRepository.saveAndFlush(promotion));
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS, "Mã khuyến mãi này đã tồn tại.");
        }
    }

    @Override
    @Transactional
    public PromotionResponse update(UUID id, UpdatePromotionRequest request) {
        Promotion promotion = getWithScopes(id);
        if (promotion.getStatus() == PromotionStatus.ACTIVE || usageRepository.existsByPromotionId(id)) {
            throw new AppException(ErrorCode.PROMOTION_NOT_EDITABLE, "Hãy tắt chương trình khuyến mãi chưa ai dùng trước khi sửa điều kiện của nó.");
        }
        validateDefinition(request.type(), request.discountValue(), request.startAt(), request.endAt());
        String code = normalizeCode(request.code());
        if (promotionRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS, "Mã khuyến mãi này đã tồn tại.");
        }
        applyDefinition(promotion, request.name(), code, request.description(), request.type(),
                request.discountValue(), request.maxDiscountAmount(), request.minOrderAmount(),
                request.startAt(), request.endAt(), request.usageLimit(), request.perUserLimit());
        replaceScopes(promotion, request.scopes());
        try {
            return toResponse(promotionRepository.saveAndFlush(promotion));
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS, "Mã khuyến mãi này đã tồn tại.");
        }
    }

    @Override
    @Transactional
    public PromotionResponse updateStatus(UUID id, PromotionStatus status) {
        Promotion promotion = getWithScopes(id);
        if (status != PromotionStatus.ACTIVE && status != PromotionStatus.INACTIVE) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Chỉ chuyển chương trình khuyến mãi sang trạng thái đang chạy hoặc tạm dừng.");
        }
        if (status == PromotionStatus.ACTIVE) {
            validateDefinition(promotion.getType(), promotion.getDiscountValue(), promotion.getStartAt(), promotion.getEndAt());
            if (!Instant.now().isBefore(promotion.getEndAt())) {
                throw new AppException(ErrorCode.PROMOTION_EXPIRED, "Chương trình khuyến mãi đã kết thúc.");
            }
        }
        promotion.setStatus(status);
        return toResponse(promotion);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Promotion promotion = getWithScopes(id);
        if (usageRepository.existsByPromotionId(id)) {
            promotion.setStatus(PromotionStatus.INACTIVE);
            return;
        }
        promotionRepository.delete(promotion);
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponse getById(UUID id) {
        return toResponse(getWithScopes(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PromotionResponse> getAll(String code, PromotionStatus status, LocalDate effectiveFrom, LocalDate effectiveTo, int page, int size) {
        if (effectiveFrom != null && effectiveTo != null && effectiveFrom.isAfter(effectiveTo)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Ngày bắt đầu áp dụng không được sau ngày kết thúc.");
        }
        Instant from = effectiveFrom == null ? null : effectiveFrom.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant toExclusive = effectiveTo == null ? null : effectiveTo.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Page<Promotion> promotions = promotionRepository.searchForManagement(normalize(code), status, from, toExclusive, pageRequest(page, size));
        return new PageResponse<>(promotions.getContent().stream().map(this::toResponse).toList(),
                Math.max(page, 1), promotions.getSize(), promotions.getTotalElements(),
                promotions.getTotalPages(), promotions.hasNext());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PromotionUsageResponse> getUsages(UUID promotionId, int page, int size) {
        if (!promotionRepository.existsById(promotionId)) {
            throw new AppException(ErrorCode.PROMOTION_NOT_FOUND, "Không tìm thấy chương trình khuyến mãi.");
        }
        Page<PromotionUsage> usages = usageRepository.findAllByPromotionId(promotionId, pageRequest(page, size));
        return new PageResponse<>(usages.getContent().stream().map(this::toUsageResponse).toList(),
                Math.max(page, 1), usages.getSize(), usages.getTotalElements(),
                usages.getTotalPages(), usages.hasNext());
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionCalculationResponse previewCart(UUID userId, String couponCode) {
        Cart cart = cartRepository.findByUserId(userId)
                .filter(current -> !current.getItems().isEmpty())
                .orElseThrow(() -> new AppException(ErrorCode.CART_EMPTY, "Giỏ hàng đang trống."));
        BigDecimal subtotal = BigDecimal.ZERO;
        List<PromotionLine> lines = new java.util.ArrayList<>();
        for (CartItem item : cart.getItems()) {
            ProductVariant variant = item.getProductVariant();
            BigDecimal basePrice = variant == null ? item.getProduct().getPrice() : variant.getPrice();
            BigDecimal framePrice = item.getProductFrameOption() == null
                    ? BigDecimal.ZERO
                    : item.getProductFrameOption().getPriceAdjustment();
            BigDecimal quantity = BigDecimal.valueOf(item.getQuantity());
            subtotal = subtotal.add(basePrice.add(framePrice).multiply(quantity));
            lines.add(new PromotionLine(item.getProduct().getCategory().getId(), item.getProduct().getId(),
                    variant == null ? null : variant.getId(), basePrice.multiply(quantity)));
        }
        Instant now = Instant.now();
        Promotion promotion = activePromotion(couponCode, now);
        ensureUserLimit(promotion, userId);
        if (promotion.getUsageLimit() > 0
                && promotion.getReservedCount() + promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED, "Mã khuyến mãi đã hết lượt sử dụng.");
        }
        return calculate(promotion, money(subtotal), lines, null);
    }

    @Override
    @Transactional
    public PromotionCalculationResponse reserve(UUID userId, Order order, String couponCode,
                                                BigDecimal subtotal, List<PromotionLine> lines) {
        PromotionUsage existing = usageRepository.findByOrderId(order.getId()).orElse(null);
        if (existing != null) {
            return calculationFromUsage(existing, subtotal);
        }
        Instant now = Instant.now();
        Promotion promotion = activePromotion(couponCode, now);
        PromotionCalculationResponse calculation = calculate(promotion, money(subtotal), lines,
                now.plus(reservationTtl));

        if (promotionRepository.reserveQuota(promotion.getId(), now) != 1) {
            throw new AppException(ErrorCode.PROMOTION_USAGE_LIMIT_REACHED,
                    "Mã khuyến mãi đã ngừng áp dụng hoặc đã hết lượt.");
        }
        ensureUserLimit(promotion, userId);

        PromotionUsage usage = new PromotionUsage();
        usage.setPromotion(promotion);
        usage.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy tài khoản của phiên đăng nhập này.")));
        usage.setOrder(order);
        usage.setCouponCode(promotion.getCode());
        usage.setEligibleSubtotal(calculation.eligibleSubtotal());
        usage.setDiscountAmount(calculation.discountAmount());
        usage.setStatus(PromotionUsageStatus.RESERVED);
        usage.setExpiresAt(calculation.reservationExpiresAt());
        usageRepository.save(usage);
        return calculation;
    }

    @Override
    @Transactional
    public void consume(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() == PromotionUsageStatus.CONSUMED) return;
        if (usage.getStatus() != PromotionUsageStatus.RESERVED) {
            throw new AppException(ErrorCode.PROMOTION_RESERVATION_EXPIRED, "Lượt giữ mã khuyến mãi không còn hiệu lực.");
        }
        Instant now = Instant.now();
        if (!now.isBefore(usage.getExpiresAt())) {
            throw new AppException(ErrorCode.PROMOTION_RESERVATION_EXPIRED, "Lượt giữ mã khuyến mãi đã hết hạn.");
        }
        if (promotionRepository.consumeReservedQuota(usage.getPromotion().getId()) != 1) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Số lượt của mã khuyến mãi đang bị lệch.");
        }
        usage.setStatus(PromotionUsageStatus.CONSUMED);
        usage.setConsumedAt(now);
    }

    @Override
    @Transactional
    public void release(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() == PromotionUsageStatus.RELEASED
                || usage.getStatus() == PromotionUsageStatus.EXPIRED) return;
        if (usage.getStatus() == PromotionUsageStatus.RESERVED) {
            requireCounterUpdate(promotionRepository.releaseReservedQuota(usage.getPromotion().getId()));
        } else if (usage.getStatus() == PromotionUsageStatus.CONSUMED) {
            requireCounterUpdate(promotionRepository.releaseConsumedQuota(usage.getPromotion().getId()));
        }
        usage.setStatus(PromotionUsageStatus.RELEASED);
        usage.setReleasedAt(Instant.now());
    }

    @Override
    @Transactional
    public void expire(Order order) {
        PromotionUsage usage = usageRepository.findByOrderIdForUpdate(order.getId()).orElse(null);
        if (usage == null || usage.getStatus() != PromotionUsageStatus.RESERVED) return;
        requireCounterUpdate(promotionRepository.releaseReservedQuota(usage.getPromotion().getId()));
        usage.setStatus(PromotionUsageStatus.EXPIRED);
        usage.setReleasedAt(Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findExpiredReservationOrderIds(Instant now) {
        return usageRepository.findTop100ByStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
                        PromotionUsageStatus.RESERVED, now)
                .stream().map(usage -> usage.getOrder().getId()).toList();
    }

    @Override
    @Transactional
    public int markEndedPromotionsExpired(Instant now) {
        return promotionRepository.markEndedPromotionsExpired(now);
    }

    private void ensureUserLimit(Promotion promotion, UUID userId) {
        if (promotion.getPerUserLimit() == 0) return;
        long usages = usageRepository.countByPromotionIdAndUserIdAndStatusIn(
                promotion.getId(), userId, ACTIVE_USAGE_STATUSES);
        if (usages >= promotion.getPerUserLimit()) {
            throw new AppException(ErrorCode.PROMOTION_USER_LIMIT_REACHED,
                    "Bạn đã dùng hết số lượt cho phép của mã này.");
        }
    }

    private PromotionCalculationResponse calculate(Promotion promotion, BigDecimal subtotal,
                                                    List<PromotionLine> lines, Instant expiresAt) {
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

    private boolean appliesTo(Promotion promotion, PromotionLine line) {
        if (promotion.isAppliesToAll()) return true;
        if (promotion.getScopes().isEmpty()) return false;
        return promotion.getScopes().stream().anyMatch(scope -> switch (scope.getScopeType()) {
            case CATEGORY -> scope.getCategory().getId().equals(line.categoryId());
            case PRODUCT -> scope.getProduct().getId().equals(line.productId());
            case VARIANT -> line.productVariantId() != null
                    && scope.getProductVariant().getId().equals(line.productVariantId());
        });
    }

    private Promotion activePromotion(String couponCode, Instant now) {
        Promotion promotion = promotionRepository.findByCodeIgnoreCase(normalizeCode(couponCode))
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND, "Không tìm thấy chương trình khuyến mãi."));
        if (promotion.getStatus() != PromotionStatus.ACTIVE) {
            throw new AppException(ErrorCode.PROMOTION_NOT_ACTIVE, "Mã khuyến mãi hiện không được áp dụng.");
        }
        if (now.isBefore(promotion.getStartAt()) || !now.isBefore(promotion.getEndAt())) {
            throw new AppException(ErrorCode.PROMOTION_EXPIRED, "Mã khuyến mãi không nằm trong thời gian áp dụng.");
        }
        return promotion;
    }

    private void replaceScopes(Promotion promotion, List<PromotionScopeRequest> requests) {
        promotion.clearScopes();
        promotion.setAppliesToAll(requests == null || requests.isEmpty());
        if (promotion.isAppliesToAll()) return;
        Set<String> uniqueScopes = new HashSet<>();
        for (PromotionScopeRequest request : requests) {
            if (!uniqueScopes.add(request.type() + ":" + request.targetId())) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Phạm vi áp dụng bị trùng.");
            }
            PromotionScope scope = new PromotionScope();
            scope.setScopeType(request.type());
            switch (request.type()) {
                case CATEGORY -> scope.setCategory(categoryRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND, "Không tìm thấy danh mục trong phạm vi áp dụng.")));
                case PRODUCT -> scope.setProduct(productRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm trong phạm vi áp dụng.")));
                case VARIANT -> scope.setProductVariant(productVariantRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, "Không tìm thấy phiên bản sản phẩm trong phạm vi áp dụng.")));
            }
            promotion.addScope(scope);
        }
    }

    private void applyDefinition(Promotion promotion, String name, String code, String description,
                                 PromotionType type, BigDecimal discountValue,
                                 BigDecimal maxDiscountAmount, BigDecimal minOrderAmount,
                                 Instant startAt, Instant endAt, int usageLimit, int perUserLimit) {
        promotion.setName(name.trim());
        promotion.setCode(code);
        promotion.setDescription(normalize(description));
        promotion.setType(type);
        promotion.setDiscountValue(money(discountValue));
        promotion.setMaxDiscountAmount(maxDiscountAmount == null ? null : money(maxDiscountAmount));
        promotion.setMinOrderAmount(money(minOrderAmount));
        promotion.setStartAt(startAt);
        promotion.setEndAt(endAt);
        promotion.setUsageLimit(usageLimit);
        promotion.setPerUserLimit(perUserLimit);
    }

    private void validateDefinition(PromotionType type, BigDecimal discountValue,
                                    Instant startAt, Instant endAt) {
        if (!endAt.isAfter(startAt)) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_PERIOD, "Thời điểm kết thúc phải sau thời điểm bắt đầu.");
        }
        if (discountValue.signum() <= 0
                || (type == PromotionType.PERCENTAGE && discountValue.compareTo(BigDecimal.valueOf(100)) > 0)) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_VALUE, "Mức giảm giá không hợp lệ.");
        }
    }

    private Promotion getWithScopes(UUID id) {
        return promotionRepository.findWithScopesById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND, "Không tìm thấy chương trình khuyến mãi."));
    }

    private PromotionResponse toResponse(Promotion promotion) {
        List<PromotionScopeResponse> scopes = promotion.getScopes().stream().map(this::toScopeResponse).toList();
        return new PromotionResponse(promotion.getId(), promotion.getName(), promotion.getCode(),
                promotion.getDescription(), promotion.getType(), promotion.getDiscountValue(),
                promotion.getMaxDiscountAmount(), promotion.getMinOrderAmount(), promotion.getStartAt(),
                promotion.getEndAt(), promotion.getUsageLimit(), promotion.getReservedCount(),
                promotion.getUsedCount(), promotion.getPerUserLimit(), promotion.isAppliesToAll(),
                promotion.getStatus(), scopes,
                promotion.getCreatedAt(), promotion.getUpdatedAt());
    }

    private PromotionScopeResponse toScopeResponse(PromotionScope scope) {
        UUID targetId;
        String targetName;
        if (scope.getScopeType() == PromotionScopeType.CATEGORY) {
            targetId = scope.getCategory().getId();
            targetName = scope.getCategory().getName();
        } else if (scope.getScopeType() == PromotionScopeType.PRODUCT) {
            targetId = scope.getProduct().getId();
            targetName = scope.getProduct().getName();
        } else {
            targetId = scope.getProductVariant().getId();
            targetName = scope.getProductVariant().getName();
        }
        return new PromotionScopeResponse(scope.getId(), scope.getScopeType(), targetId, targetName);
    }

    private PromotionUsageResponse toUsageResponse(PromotionUsage usage) {
        return new PromotionUsageResponse(usage.getId(), usage.getPromotion().getId(), usage.getUser().getId(),
                usage.getOrder().getId(), usage.getOrder().getOrderCode(), usage.getCouponCode(),
                usage.getEligibleSubtotal(), usage.getDiscountAmount(), usage.getStatus(), usage.getExpiresAt(),
                usage.getConsumedAt(), usage.getReleasedAt(), usage.getCreatedAt());
    }

    private PromotionCalculationResponse calculationFromUsage(PromotionUsage usage, BigDecimal subtotal) {
        return new PromotionCalculationResponse(usage.getPromotion().getId(), usage.getCouponCode(),
                usage.getPromotion().getType(), money(subtotal), usage.getEligibleSubtotal(),
                usage.getDiscountAmount(), money(subtotal.subtract(usage.getDiscountAmount())),
                usage.getExpiresAt());
    }

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private void requireCounterUpdate(int updated) {
        if (updated != 1) {
            throw new AppException(ErrorCode.INTERNAL_ERROR, "Số lượt của mã khuyến mãi đang bị lệch.");
        }
    }

    private BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeCode(String code) {
        return code.trim().toUpperCase(java.util.Locale.ROOT);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
