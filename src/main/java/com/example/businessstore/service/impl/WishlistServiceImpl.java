package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddWishlistItemRequest;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.dto.response.ProductVariantResponse;
import com.example.businessstore.dto.response.WishlistItemResponse;
import com.example.businessstore.dto.response.WishlistResponse;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.WishlistItem;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductMapper;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.repository.WishlistItemRepository;
import com.example.businessstore.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishlistServiceImpl implements WishlistService {
    private final WishlistItemRepository wishlistItemRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final ProductImageRepository productImageRepository;
    private final UserRepository userRepository;
    private final ProductMapper productMapper;

    @Override
    @Transactional(readOnly = true)
    public WishlistResponse getCurrent(UUID userId) {
        List<WishlistItemResponse> items = wishlistItemRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
        return new WishlistResponse(items, items.size());
    }

    @Override
    @Transactional
    public WishlistItemResponse add(UUID userId, AddWishlistItemRequest request) {
        Product product = productRepository.findById(request.productId())
                .filter(item -> item.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE,
                        "Sản phẩm này không lưu vào danh sách yêu thích được."));
        ProductVariant variant = selectedVariant(product.getId(), request.productVariantId());
        Optional<WishlistItem> existing = findExisting(userId, product.getId(), variant == null ? null : variant.getId());
        if (existing.isPresent()) return toResponse(existing.get());

        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy tài khoản của phiên đăng nhập này.");
        }
        wishlistItemRepository.insertIfAbsent(UUID.randomUUID(), userId, product.getId(),
                variant == null ? null : variant.getId());
        return toResponse(findExisting(userId, product.getId(), variant == null ? null : variant.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_ERROR,
                        "Không thêm được vào danh sách yêu thích.")));
    }

    @Override
    @Transactional
    public void remove(UUID userId, UUID itemId) {
        WishlistItem item = wishlistItemRepository.findByIdAndUserId(itemId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.WISHLIST_ITEM_NOT_FOUND, "Không tìm thấy mục trong danh sách yêu thích."));
        wishlistItemRepository.delete(item);
    }

    private ProductVariant selectedVariant(UUID productId, UUID variantId) {
        if (variantId == null) return null;
        return productVariantRepository.findByIdAndProductId(variantId, productId)
                .filter(ProductVariant::isAvailable)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_AVAILABLE,
                        "Phiên bản sản phẩm này không lưu vào danh sách yêu thích được."));
    }

    private Optional<WishlistItem> findExisting(UUID userId, UUID productId, UUID variantId) {
        return variantId == null
                ? wishlistItemRepository.findByUserIdAndProductIdAndProductVariantIsNull(userId, productId)
                : wishlistItemRepository.findByUserIdAndProductIdAndProductVariantId(userId, productId, variantId);
    }

    private WishlistItemResponse toResponse(WishlistItem item) {
        Product product = item.getProduct();
        ProductResponse productResponse = productMapper.toResponse(product);
        ProductVariant variant = item.getProductVariant();
        ProductVariantResponse variantResponse = variant == null ? null : new ProductVariantResponse(
                variant.getId(), product.getId(), variant.getSku(), variant.getName(), variant.getWidthCm(),
                variant.getHeightCm(), variant.getArtSize() == null ? null : variant.getArtSize().getId(), variant.getArtSize() == null ? "CUSTOM" : variant.getArtSize().getCode(), variant.getMaterialDefinition() == null ? null : variant.getMaterialDefinition().getId(), variant.getMaterial(), variant.getPrice(), variant.getStockQuantity(),
                variant.isAvailable());
        String primaryImageUrl = productImageRepository
                .findFirstByProductIdAndPrimaryImageTrueOrderByCreatedAtAsc(product.getId())
                .or(() -> productImageRepository.findFirstByProductIdOrderBySortOrderAscCreatedAtAsc(product.getId()))
                .map(image -> image.getSecureUrl())
                .orElse(null);
        return new WishlistItemResponse(item.getId(), productResponse, variantResponse, primaryImageUrl,
                item.getCreatedAt());
    }
}
