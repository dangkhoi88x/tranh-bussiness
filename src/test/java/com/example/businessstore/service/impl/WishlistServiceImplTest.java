package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddWishlistItemRequest;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.dto.response.WishlistItemResponse;
import com.example.businessstore.entity.Category;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WishlistServiceImplTest {
    @Mock private WishlistItemRepository wishlistItemRepository;
    @Mock private ProductRepository productRepository;
    @Mock private ProductVariantRepository productVariantRepository;
    @Mock private ProductImageRepository productImageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductMapper productMapper;
    @InjectMocks private WishlistServiceImpl wishlistService;

    private UUID userId;
    private Product product;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        Category category = new Category(); category.setId(UUID.randomUUID()); category.setName("Phong cảnh");
        product = new Product(); product.setId(UUID.randomUUID()); product.setCategory(category);
        product.setName("Tranh núi"); product.setSlug("tranh-nui"); product.setPrice(new BigDecimal("450000"));
        product.setStockQuantity(3); product.setStatus(ProductStatus.PUBLISHED);
    }

    private void stubCardResponse() {
        Category category = product.getCategory();
        when(productMapper.toResponse(product)).thenReturn(new ProductResponse(product.getId(), category.getId(),
                category.getName(), product.getName(), product.getSlug(), null, product.getPrice(), null, null,
                product.getStockQuantity(), product.getStatus(), null, null));
        when(productImageRepository.findFirstByProductIdAndPrimaryImageTrueOrderByCreatedAtAsc(product.getId()))
                .thenReturn(Optional.empty());
        when(productImageRepository.findFirstByProductIdOrderBySortOrderAscCreatedAtAsc(product.getId()))
                .thenReturn(Optional.empty());
    }

    @Test
    void add_returnsExistingGenericProductWithoutCreatingDuplicate() {
        WishlistItem existing = item(product, null);
        stubCardResponse();
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(wishlistItemRepository.findByUserIdAndProductIdAndProductVariantIsNull(userId, product.getId()))
                .thenReturn(Optional.of(existing));

        WishlistItemResponse response = wishlistService.add(userId, new AddWishlistItemRequest(product.getId(), null));

        assertThat(response.id()).isEqualTo(existing.getId());
        assertThat(response.product().id()).isEqualTo(product.getId());
        verify(wishlistItemRepository, never()).insertIfAbsent(
                any(UUID.class), any(UUID.class), any(UUID.class), any(UUID.class));
    }

    @Test
    void add_variantUsesAtomicInsertAndReturnsServerState() {
        UUID variantId = UUID.randomUUID();
        ProductVariant variant = variant(product, variantId);
        WishlistItem saved = item(product, variant);
        stubCardResponse();
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(productVariantRepository.findByIdAndProductId(variantId, product.getId())).thenReturn(Optional.of(variant));
        AtomicInteger existingLookups = new AtomicInteger();
        when(wishlistItemRepository.findByUserIdAndProductIdAndProductVariantId(userId, product.getId(), variantId))
                .thenAnswer(invocation -> existingLookups.getAndIncrement() == 0
                        ? Optional.<WishlistItem>empty()
                        : Optional.of(saved));
        when(userRepository.existsById(userId)).thenReturn(true);

        WishlistItemResponse response = wishlistService.add(userId, new AddWishlistItemRequest(product.getId(), variantId));

        assertThat(response.selectedVariant()).isNotNull();
        assertThat(response.selectedVariant().id()).isEqualTo(variantId);
        verify(wishlistItemRepository).insertIfAbsent(any(), eq(userId), eq(product.getId()), eq(variantId));
    }

    @Test
    void add_rejectsVariantThatDoesNotBelongToProduct() {
        UUID variantId = UUID.randomUUID();
        when(productRepository.findById(product.getId())).thenReturn(Optional.of(product));
        when(productVariantRepository.findByIdAndProductId(variantId, product.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> wishlistService.add(userId, new AddWishlistItemRequest(product.getId(), variantId)))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.PRODUCT_VARIANT_NOT_AVAILABLE);
    }

    @Test
    void remove_onlyDeletesItemOwnedByAuthenticatedUser() {
        UUID itemId = UUID.randomUUID();
        WishlistItem existing = item(product, null); existing.setId(itemId);
        when(wishlistItemRepository.findByIdAndUserId(itemId, userId)).thenReturn(Optional.of(existing));

        wishlistService.remove(userId, itemId);

        verify(wishlistItemRepository).delete(existing);
    }

    private WishlistItem item(Product product, ProductVariant variant) {
        WishlistItem item = new WishlistItem(); item.setId(UUID.randomUUID()); item.setProduct(product);
        item.setProductVariant(variant); return item;
    }

    private ProductVariant variant(Product product, UUID id) {
        ProductVariant variant = new ProductVariant(); variant.setId(id); variant.setProduct(product);
        variant.setSku("CANVAS-40X60"); variant.setName("Canvas 40x60"); variant.setMaterial("Canvas");
        variant.setWidthCm(new BigDecimal("40")); variant.setHeightCm(new BigDecimal("60"));
        variant.setPrice(new BigDecimal("500000")); variant.setStockQuantity(2); variant.setAvailable(true);
        return variant;
    }
}
