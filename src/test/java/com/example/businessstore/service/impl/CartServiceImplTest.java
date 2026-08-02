package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.response.CartResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductFrameOptionMapper;
import com.example.businessstore.repository.CartItemRepository;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
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
        when(cartItemRepository.findByCartIdAndProductIdAndProductFrameOptionIsNull(cart.getId(), productId))
                .thenReturn(Optional.empty());
        when(cartItemRepository.save(any(CartItem.class))).thenAnswer(invocation -> {
            CartItem item = invocation.getArgument(0);
            item.setId(UUID.randomUUID());
            return item;
        });

        CartResponse response = cartService.addItem(userId, new AddCartItemRequest(productId, null, 2));

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
        when(cartItemRepository.findByCartIdAndProductIdAndProductFrameOptionIsNull(cart.getId(), productId))
                .thenReturn(Optional.of(existingItem));

        assertThatThrownBy(() -> cartService.addItem(userId, new AddCartItemRequest(productId, null, 2)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INSUFFICIENT_PRODUCT_STOCK);
    }
}
