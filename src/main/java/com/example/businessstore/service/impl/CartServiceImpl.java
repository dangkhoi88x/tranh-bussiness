package com.example.businessstore.service.impl;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.request.UpdateCartItemRequest;
import com.example.businessstore.dto.response.CartItemResponse;
import com.example.businessstore.dto.response.CartResponse;
import com.example.businessstore.dto.response.ProductFrameOptionResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductFrameOptionMapper;
import com.example.businessstore.repository.CartItemRepository;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final ProductFrameOptionRepository productFrameOptionRepository;
    private final ProductFrameOptionMapper productFrameOptionMapper;

    @Override
    @Transactional
    public CartResponse getCurrentCart(UUID userId) {
        return toResponse(getOrCreateCart(userId));
    }

    @Override
    @Transactional
    public CartResponse addItem(UUID userId, AddCartItemRequest request) {
        Cart cart = getOrCreateCart(userId);
        Product product = getPurchasableProduct(request.productId());
        ProductFrameOption frameOption = request.productFrameOptionId() == null
                ? null
                : getAvailableFrameOption(product.getId(), request.productFrameOptionId());

        CartItem item = findExistingItem(cart, product.getId(), frameOption == null ? null : frameOption.getId())
                .orElseGet(() -> createItem(cart, product, frameOption));
        int requestedQuantity = item.getQuantity() + request.quantity();
        validateStock(product, requestedQuantity);
        item.setQuantity(requestedQuantity);
        if (item.getId() == null) {
            cartItemRepository.save(item);
        }
        return toResponse(cart);
    }

    @Override
    @Transactional
    public CartResponse updateItem(UUID userId, UUID itemId, UpdateCartItemRequest request) {
        CartItem item = getOwnedItem(userId, itemId);
        Product product = getPurchasableProduct(item.getProduct().getId());
        if (item.getProductFrameOption() != null) {
            getAvailableFrameOption(product.getId(), item.getProductFrameOption().getId());
        }
        validateStock(product, request.quantity());
        item.setQuantity(request.quantity());
        return toResponse(getOrCreateCart(userId));
    }

    @Override
    @Transactional
    public void removeItem(UUID userId, UUID itemId) {
        cartItemRepository.delete(getOwnedItem(userId, itemId));
    }

    @Override
    @Transactional
    public void clear(UUID userId) {
        cartRepository.findByUserId(userId).ifPresent(cart -> cart.getItems().clear());
    }

    private Cart getOrCreateCart(UUID userId) {
        return cartRepository.findByUserId(userId).orElseGet(() -> {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Authenticated user was not found"));
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    private Product getPurchasableProduct(UUID productId) {
        return productRepository.findById(productId)
                .filter(product -> product.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE, "Product is not available for purchase"));
    }

    private ProductFrameOption getAvailableFrameOption(UUID productId, UUID optionId) {
        ProductFrameOption option = productFrameOptionRepository.findByIdAndProductId(optionId, productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_FOUND, "Product frame option not found"));
        if (!option.isAvailable() || option.getFrame().getStatus() != FrameStatus.ACTIVE) {
            throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE, "Product frame option is not available");
        }
        return option;
    }

    private java.util.Optional<CartItem> findExistingItem(Cart cart, UUID productId, UUID frameOptionId) {
        if (frameOptionId == null) {
            return cartItemRepository.findByCartIdAndProductIdAndProductFrameOptionIsNull(cart.getId(), productId);
        }
        return cartItemRepository.findByCartIdAndProductIdAndProductFrameOptionId(cart.getId(), productId, frameOptionId);
    }

    private CartItem createItem(Cart cart, Product product, ProductFrameOption frameOption) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setProductFrameOption(frameOption);
        item.setQuantity(0);
        cart.getItems().add(item);
        return item;
    }

    private CartItem getOwnedItem(UUID userId, UUID itemId) {
        return cartItemRepository.findByIdAndCartUserId(itemId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND, "Cart item not found"));
    }

    private void validateStock(Product product, int quantity) {
        if (quantity > product.getStockQuantity()) {
            throw new AppException(ErrorCode.INSUFFICIENT_PRODUCT_STOCK, "Requested quantity exceeds available stock");
        }
    }

    private CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cart.getItems().stream().map(this::toItemResponse).toList();
        int totalQuantity = items.stream().mapToInt(CartItemResponse::quantity).sum();
        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CartResponse(cart.getId(), items, totalQuantity, subtotal);
    }

    private CartItemResponse toItemResponse(CartItem item) {
        ProductFrameOptionResponse frameOption = item.getProductFrameOption() == null
                ? null
                : productFrameOptionMapper.toResponse(item.getProductFrameOption());
        BigDecimal unitPrice = item.getProduct().getPrice();
        if (item.getProductFrameOption() != null) {
            unitPrice = unitPrice.add(item.getProductFrameOption().getPriceAdjustment());
        }
        return new CartItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getSlug(),
                item.getProduct().getPrice(),
                frameOption,
                unitPrice,
                item.getQuantity(),
                unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
    }
}
