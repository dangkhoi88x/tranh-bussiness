package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.response.CartResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.User;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductFrameOptionMapper;
import com.example.businessstore.repository.CartItemRepository;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.PhotobookDesignRepository;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceImplTest {

    @Mock
    private CartRepository cartRepository;
    @Mock
    private CartItemRepository cartItemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductFrameOptionRepository productFrameOptionRepository;
    @Mock
    private ProductFrameOptionMapper productFrameOptionMapper;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @Mock
    private PhotobookDesignRepository photobookDesignRepository;
    @Mock
    private PhotobookPageTierRepository photobookPageTierRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private UUID userId;
    private UUID productId;
    private Product product;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();
        product = new Product();
        product.setId(productId);
        product.setName("Tranh hoa sen");
        product.setSlug("tranh-hoa-sen");
        product.setPrice(new BigDecimal("250000.00"));
        product.setStockQuantity(5);
        product.setStatus(ProductStatus.PUBLISHED);
    }

    @Test
    void addItem_createsCartAndReturnsCalculatedTotals() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        User user = new User();
        user.setId(userId);

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(cartRepository.save(any(Cart.class))).thenReturn(cart);
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountIsNullAndPhotobookDesignIdIsNull(cart.getId(), productId, null))
                .thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem item = invocation.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });

        CartResponse response = cartService.addItem(userId, new AddCartItemRequest(productId, null, null, null, null, 2));

        assertThat(response.totalQuantity()).isEqualTo(2);
        assertThat(response.subtotal()).isEqualByComparingTo("500000.00");
        assertThat(response.items()).singleElement().satisfies(item -> {
            assertThat(item.productId()).isEqualTo(productId);
            assertThat(item.quantity()).isEqualTo(2);
            assertThat(item.unitPrice()).isEqualByComparingTo("250000.00");
        });
    }

    @Test
    void addItem_rejectsQuantityAboveAvailableStock() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        CartItem existingItem = new CartItem();
        existingItem.setCart(cart);
        existingItem.setProduct(product);
        existingItem.setQuantity(4);

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(cartItemRepository.findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountIsNullAndPhotobookDesignIdIsNull(cart.getId(), productId, null))
                .thenReturn(Optional.of(existingItem));

        assertThatThrownBy(() -> cartService.addItem(userId, new AddCartItemRequest(productId, null, null, null, null, 2)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_PRODUCT_STOCK);
    }

    @Test
    void addItem_requiresVariantWhenProductHasVariants() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productVariantRepository.existsByProductId(productId)).thenReturn(true);

        assertThatThrownBy(() -> cartService.addItem(userId, new AddCartItemRequest(productId, null, null, null, null, 1)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.PRODUCT_VARIANT_REQUIRED);
    }

    @Test
    void addItem_usesVariantPriceAndStock() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        UUID variantId = UUID.randomUUID();
        ProductVariant variant = new ProductVariant();
        variant.setId(variantId);
        variant.setProduct(product);
        variant.setSku("CANVAS-40X60");
        variant.setName("Canvas 40x60");
        variant.setMaterial("Canvas");
        variant.setWidthCm(new BigDecimal("40"));
        variant.setHeightCm(new BigDecimal("60"));
        variant.setPrice(new BigDecimal("350000.00"));
        variant.setStockQuantity(3);
        variant.setAvailable(true);

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productVariantRepository.existsByProductId(productId)).thenReturn(true);
        when(productVariantRepository.findByIdAndProductId(variantId, productId)).thenReturn(Optional.of(variant));
        when(cartItemRepository.findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountIsNullAndPhotobookDesignIdIsNull(cart.getId(), productId, variantId)).thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem item = invocation.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });

        CartResponse response = cartService.addItem(userId, new AddCartItemRequest(productId, variantId, null, null, null, 2));

        assertThat(response.subtotal()).isEqualByComparingTo("700000.00");
        assertThat(response.items().getFirst().selectedVariant().sku()).isEqualTo("CANVAS-40X60");
    }

    @Test
    void addItem_rejectsUnknownPhotobookDesign() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        Product photobook = pagePricedProduct();
        ProductVariant variant = pagePricedVariant(photobook);
        UUID designId = UUID.randomUUID();

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(photobook.getId())).thenReturn(Optional.of(photobook));
        when(productVariantRepository.existsByProductId(photobook.getId())).thenReturn(true);
        when(productVariantRepository.findByIdAndProductId(variant.getId(), photobook.getId())).thenReturn(Optional.of(variant));
        when(photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()))
                .thenReturn(List.of(pageTier(variant, 20, "1000000.00")));
        when(photobookDesignRepository.findByIdAndUserId(designId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> cartService.addItem(userId,
                new AddCartItemRequest(photobook.getId(), variant.getId(), null, 20, designId, 1)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.PHOTOBOOK_DESIGN_NOT_FOUND);
    }

    @Test
    void addItem_rejectsPhotobookDesignForDifferentProduct() {
        Cart cart = new Cart();
        cart.setId(UUID.randomUUID());
        Product photobook = pagePricedProduct();
        ProductVariant variant = pagePricedVariant(photobook);
        UUID designId = UUID.randomUUID();
        PhotobookDesign design = new PhotobookDesign();
        design.setId(designId);
        design.setProductSlug("a-different-photobook");
        design.setPageCount(20);

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));
        when(productRepository.findById(photobook.getId())).thenReturn(Optional.of(photobook));
        when(productVariantRepository.existsByProductId(photobook.getId())).thenReturn(true);
        when(productVariantRepository.findByIdAndProductId(variant.getId(), photobook.getId())).thenReturn(Optional.of(variant));
        when(photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId()))
                .thenReturn(List.of(pageTier(variant, 20, "1000000.00")));
        when(photobookDesignRepository.findByIdAndUserId(designId, userId)).thenReturn(Optional.of(design));

        assertThatThrownBy(() -> cartService.addItem(userId,
                new AddCartItemRequest(photobook.getId(), variant.getId(), null, 20, designId, 1)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.PHOTOBOOK_DESIGN_MISMATCH);
    }

    private Product pagePricedProduct() {
        Product photobook = new Product();
        photobook.setId(UUID.randomUUID());
        photobook.setName("Photobook Eco Matte");
        photobook.setSlug("photobook-eco-matte");
        photobook.setPrice(new BigDecimal("1000000.00"));
        photobook.setStockQuantity(50);
        photobook.setStatus(ProductStatus.PUBLISHED);
        photobook.setMinPages(20);
        photobook.setMaxPages(150);
        photobook.setPageStep(2);
        photobook.setPricePerStep(new BigDecimal("40000.00"));
        return photobook;
    }

    private ProductVariant pagePricedVariant(Product product) {
        ProductVariant variant = new ProductVariant();
        variant.setId(UUID.randomUUID());
        variant.setProduct(product);
        variant.setSku("PB-ECO-S");
        variant.setName("Size S");
        variant.setPrice(new BigDecimal("1000000.00"));
        variant.setStockQuantity(50);
        variant.setAvailable(true);
        return variant;
    }

    private com.example.businessstore.entity.PhotobookPageTier pageTier(ProductVariant variant, int pageCount, String price) {
        com.example.businessstore.entity.PhotobookPageTier tier = new com.example.businessstore.entity.PhotobookPageTier();
        tier.setProductVariant(variant);
        tier.setPageCount(pageCount);
        tier.setPrice(new BigDecimal(price));
        return tier;
    }
}
