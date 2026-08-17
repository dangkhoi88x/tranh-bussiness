package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionScopeType;
import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.dto.request.PromotionScopeRequest;
import com.example.businessstore.dto.request.UpdatePromotionRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PromotionResponse;
import com.example.businessstore.dto.response.PromotionScopeResponse;
import com.example.businessstore.dto.response.PromotionUsageResponse;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.entity.PromotionScope;
import com.example.businessstore.entity.PromotionUsage;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Manages promotion definitions and their administrative representation. */
@Service
@RequiredArgsConstructor
public class PromotionDefinitionService {

    private static final int MAX_PAGE_SIZE = 100;

    private final PromotionRepository promotionRepository;
    private final PromotionUsageRepository usageRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

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
        return saveDefinition(promotion);
    }

    @Transactional
    public PromotionResponse update(UUID id, UpdatePromotionRequest request) {
        Promotion promotion = getWithScopes(id);
        if (promotion.getStatus() == PromotionStatus.ACTIVE || usageRepository.existsByPromotionId(id)) {
            throw new AppException(ErrorCode.PROMOTION_NOT_EDITABLE,
                    "Hãy tắt chương trình khuyến mãi chưa ai dùng trước khi sửa điều kiện của nó.");
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
        return saveDefinition(promotion);
    }

    @Transactional
    public PromotionResponse updateStatus(UUID id, PromotionStatus status) {
        Promotion promotion = getWithScopes(id);
        if (status != PromotionStatus.ACTIVE && status != PromotionStatus.INACTIVE) {
            throw new AppException(ErrorCode.INVALID_REQUEST,
                    "Chỉ chuyển chương trình khuyến mãi sang trạng thái đang chạy hoặc tạm dừng.");
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

    @Transactional
    public void delete(UUID id) {
        Promotion promotion = getWithScopes(id);
        if (usageRepository.existsByPromotionId(id)) {
            promotion.setStatus(PromotionStatus.INACTIVE);
            return;
        }
        promotionRepository.delete(promotion);
    }

    @Transactional(readOnly = true)
    public PromotionResponse getById(UUID id) {
        return toResponse(getWithScopes(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<PromotionResponse> getAll(
            String code,
            PromotionStatus status,
            LocalDate effectiveFrom,
            LocalDate effectiveTo,
            int page,
            int size) {
        if (effectiveFrom != null && effectiveTo != null && effectiveFrom.isAfter(effectiveTo)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Ngày bắt đầu áp dụng không được sau ngày kết thúc.");
        }
        Instant from = effectiveFrom == null ? null : effectiveFrom.atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Instant toExclusive = effectiveTo == null ? null
                : effectiveTo.plusDays(1).atStartOfDay(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant();
        Page<Promotion> promotions = promotionRepository.searchForManagement(
                normalize(code), status, from, toExclusive, pageRequest(page, size));
        return new PageResponse<>(promotions.getContent().stream().map(this::toResponse).toList(),
                Math.max(page, 1), promotions.getSize(), promotions.getTotalElements(),
                promotions.getTotalPages(), promotions.hasNext());
    }

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

    private PromotionResponse saveDefinition(Promotion promotion) {
        try {
            return toResponse(promotionRepository.saveAndFlush(promotion));
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS, "Mã khuyến mãi này đã tồn tại.");
        }
    }

    private void replaceScopes(Promotion promotion, List<PromotionScopeRequest> requests) {
        promotion.clearScopes();
        promotion.setAppliesToAll(requests == null || requests.isEmpty());
        if (promotion.isAppliesToAll()) {
            return;
        }
        Set<String> uniqueScopes = new HashSet<>();
        for (PromotionScopeRequest request : requests) {
            if (!uniqueScopes.add(request.type() + ":" + request.targetId())) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Phạm vi áp dụng bị trùng.");
            }
            PromotionScope scope = new PromotionScope();
            scope.setScopeType(request.type());
            switch (request.type()) {
                case CATEGORY -> scope.setCategory(categoryRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND,
                                "Không tìm thấy danh mục trong phạm vi áp dụng.")));
                case PRODUCT -> scope.setProduct(productRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND,
                                "Không tìm thấy sản phẩm trong phạm vi áp dụng.")));
                case VARIANT -> scope.setProductVariant(productVariantRepository.findById(request.targetId())
                        .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
                                "Không tìm thấy phiên bản sản phẩm trong phạm vi áp dụng.")));
            }
            promotion.addScope(scope);
        }
    }

    private void applyDefinition(
            Promotion promotion,
            String name,
            String code,
            String description,
            PromotionType type,
            BigDecimal discountValue,
            BigDecimal maxDiscountAmount,
            BigDecimal minOrderAmount,
            Instant startAt,
            Instant endAt,
            int usageLimit,
            int perUserLimit) {
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

    private void validateDefinition(PromotionType type, BigDecimal discountValue, Instant startAt, Instant endAt) {
        if (!endAt.isAfter(startAt)) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_PERIOD,
                    "Thời điểm kết thúc phải sau thời điểm bắt đầu.");
        }
        if (discountValue.signum() <= 0
                || (type == PromotionType.PERCENTAGE && discountValue.compareTo(BigDecimal.valueOf(100)) > 0)) {
            throw new AppException(ErrorCode.INVALID_PROMOTION_VALUE, "Mức giảm giá không hợp lệ.");
        }
    }

    private Promotion getWithScopes(UUID id) {
        return promotionRepository.findWithScopesById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PROMOTION_NOT_FOUND,
                        "Không tìm thấy chương trình khuyến mãi."));
    }

    private PromotionResponse toResponse(Promotion promotion) {
        List<PromotionScopeResponse> scopes = promotion.getScopes().stream().map(this::toScopeResponse).toList();
        return new PromotionResponse(promotion.getId(), promotion.getName(), promotion.getCode(),
                promotion.getDescription(), promotion.getType(), promotion.getDiscountValue(),
                promotion.getMaxDiscountAmount(), promotion.getMinOrderAmount(), promotion.getStartAt(),
                promotion.getEndAt(), promotion.getUsageLimit(), promotion.getReservedCount(),
                promotion.getUsedCount(), promotion.getPerUserLimit(), promotion.isAppliesToAll(),
                promotion.getStatus(), scopes, promotion.getCreatedAt(), promotion.getUpdatedAt());
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

    private PageRequest pageRequest(int page, int size) {
        return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
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
