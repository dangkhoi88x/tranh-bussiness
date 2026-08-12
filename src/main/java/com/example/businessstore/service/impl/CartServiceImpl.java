package com.example.businessstore.service.impl;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.AddCartItemRequest;
import com.example.businessstore.dto.request.UpdateCartItemRequest;
import com.example.businessstore.dto.response.CartItemResponse;
import com.example.businessstore.dto.response.CartResponse;
import com.example.businessstore.dto.response.ProductFrameOptionResponse;
import com.example.businessstore.dto.response.ProductVariantResponse;
import com.example.businessstore.entity.Cart;
import com.example.businessstore.entity.CartItem;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductFrameOption;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductFrameOptionMapper;
import com.example.businessstore.repository.CartItemRepository;
import com.example.businessstore.repository.CartRepository;
import com.example.businessstore.repository.PhotobookDesignRepository;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.PhotobookTemplateRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.CartService;
import com.example.businessstore.service.PhotobookPricing;
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
    private final ProductVariantRepository productVariantRepository;
    private final PhotobookPageTierRepository photobookPageTierRepository;
    private final PhotobookDesignRepository photobookDesignRepository;
    private final PhotobookTemplateRepository photobookTemplateRepository;

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
        ProductVariant variant = getSelectedVariant(product, request.productVariantId());
        ProductFrameOption frameOption = request.productFrameOptionId() == null
                ? null
                : getAvailableFrameOption(product.getId(), request.productFrameOptionId());
        validateFrameCompatibility(frameOption, variant);
        Integer pageCount = validatePageCount(product, variant, request.pageCount());
        PhotobookDesign design = resolveDesign(userId, product, pageCount, request.photobookDesignId());
        String templateCode = resolveTemplateCode(product, pageCount, request.photobookTemplateCode());

        CartItem item = findExistingItem(cart, product.getId(), variant == null ? null : variant.getId(), frameOption == null ? null : frameOption.getId(), pageCount, design == null ? null : design.getId(), templateCode)
                .orElseGet(() -> createItem(cart, product, variant, frameOption, pageCount, design, templateCode));
        int requestedQuantity = item.getQuantity() + request.quantity();
        validateStock(product, variant, requestedQuantity);
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
        ProductVariant variant = item.getProductVariant() == null ? null : getSelectedVariant(product, item.getProductVariant().getId());
        if (item.getProductFrameOption() != null) {
            ProductFrameOption frameOption = getAvailableFrameOption(product.getId(), item.getProductFrameOption().getId());
            validateFrameCompatibility(frameOption, variant);
        }
        validateStock(product, variant, request.quantity());
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

    /**
     * Cùng sản phẩm nhưng khác khổ, khung, số trang, bản thiết kế hay mẫu là những dòng giỏ hàng
     * riêng biệt — hai bản thiết kế khác nhau ở cùng khổ/số trang không được gộp làm một, nếu
     * không cuốn sẽ in nhầm theo bản thiết kế còn lại.
     *
     * Đối chiếu ngay trên cart.getItems() thay vì hỏi repository: khoá gộp có sáu chiều nullable
     * nên derived query phải liệt kê đủ tổ hợp IsNull, và mỗi chiều thêm vào lại nhân đôi số
     * phương thức. Danh sách item đã nạp sẵn trong cùng transaction (toResponse duyệt nó ngay
     * sau đây), lại thấy được cả dòng vừa thêm chưa flush — điều derived query không làm được.
     */
    private java.util.Optional<CartItem> findExistingItem(Cart cart, UUID productId, UUID variantId, UUID frameOptionId, Integer pageCount, UUID designId, String templateCode) {
        return cart.getItems().stream()
                .filter(item -> item.getProduct().getId().equals(productId)
                        && java.util.Objects.equals(item.getProductVariant() == null ? null : item.getProductVariant().getId(), variantId)
                        && java.util.Objects.equals(item.getProductFrameOption() == null ? null : item.getProductFrameOption().getId(), frameOptionId)
                        && java.util.Objects.equals(item.getPageCount(), pageCount)
                        && java.util.Objects.equals(item.getPhotobookDesign() == null ? null : item.getPhotobookDesign().getId(), designId)
                        && java.util.Objects.equals(item.getPhotobookTemplateCode(), templateCode))
                .findFirst();
    }

    /** Design phải khớp đúng sản phẩm và số trang khách vừa chọn — không tin liên kết từ client. */
    private PhotobookDesign resolveDesign(UUID userId, Product product, Integer pageCount, UUID designId) {
        if (designId == null) return null;
        PhotobookDesign design = photobookDesignRepository.findByIdAndUserId(designId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_DESIGN_NOT_FOUND, "Photobook design not found"));
        if (!design.getProductSlug().equals(product.getSlug())
                || pageCount == null || design.getPageCount() != pageCount) {
            throw new AppException(ErrorCode.PHOTOBOOK_DESIGN_MISMATCH,
                    "Design does not match the selected product or page count");
        }
        return design;
    }

    /**
     * Mẫu chỉ có nghĩa với cuốn bán theo trang, và phải là mã có thật trong thư viện — client
     * gửi mã lạ thì báo lỗi ngay thay vì để dòng đơn mang mã chết tới tận lúc xưởng dựng spread.
     */
    private String resolveTemplateCode(Product product, Integer pageCount, String requested) {
        if (requested == null || requested.isBlank()) return null;
        if (!product.isPagePriced() || pageCount == null) {
            throw new AppException(ErrorCode.PHOTOBOOK_TEMPLATE_NOT_ALLOWED,
                    "This product is not sold with photobook templates");
        }
        // Lọc theo active: chủ đề đã ẩn khỏi thư viện thì khách không chọn mới được nữa, dù cuốn
        // đã đặt theo nó trước đó vẫn dựng bình thường.
        return photobookTemplateRepository.findByCodeAndActiveTrue(requested)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_TEMPLATE_NOT_FOUND,
                        "Unknown photobook template: " + requested))
                .getCode();
    }

    private CartItem createItem(Cart cart, Product product, ProductVariant variant, ProductFrameOption frameOption, Integer pageCount, PhotobookDesign design, String templateCode) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setProductVariant(variant);
        item.setProductFrameOption(frameOption);
        item.setPageCount(pageCount);
        item.setPhotobookDesign(design);
        item.setPhotobookTemplateCode(templateCode);
        item.setQuantity(0);
        cart.getItems().add(item);
        return item;
    }

    /**
     * Photobook bắt buộc phải có số trang và số đó phải nằm trong bảng giá; sản phẩm thường
     * thì không được mang số trang, tránh việc client gửi kèm rồi tưởng giá đã đổi theo.
     */
    private Integer validatePageCount(Product product, ProductVariant variant, Integer requested) {
        if (!product.isPagePriced()) {
            if (requested != null) {
                throw new AppException(ErrorCode.INVALID_PHOTOBOOK_PAGE_COUNT, "This product is not sold by page count");
            }
            return null;
        }
        if (variant == null) {
            throw new AppException(ErrorCode.PRODUCT_VARIANT_REQUIRED, "Select a photobook size before adding it to cart");
        }
        if (requested == null) {
            throw new AppException(ErrorCode.PHOTOBOOK_PAGE_COUNT_REQUIRED, "Select a page count for this photobook");
        }
        // Ném nếu số trang không bán được; giá trả về ở đây bỏ đi, toResponse tính lại khi đọc giỏ.
        PhotobookPricing.priceAt(product, pageTiersOf(variant), requested);
        return requested;
    }

    private List<PhotobookPageTier> pageTiersOf(ProductVariant variant) {
        return photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId());
    }

    /** Giá một cuốn/bức trước phụ thu khung: theo số trang với photobook, theo variant với hàng thường. */
    private BigDecimal basePriceOf(CartItem item) {
        ProductVariant variant = item.getProductVariant();
        if (variant == null) {
            return item.getProduct().getPrice();
        }
        if (item.getProduct().isPagePriced() && item.getPageCount() != null) {
            return PhotobookPricing.priceAt(item.getProduct(), pageTiersOf(variant), item.getPageCount());
        }
        return variant.getPrice();
    }

    private CartItem getOwnedItem(UUID userId, UUID itemId) {
        return cartItemRepository.findByIdAndCartUserId(itemId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND, "Cart item not found"));
    }

    private void validateStock(Product product, ProductVariant variant, int quantity) {
        int availableStock = variant == null ? product.getStockQuantity() : variant.getStockQuantity();
        if (quantity > availableStock) {
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
        ProductVariant variant = item.getProductVariant();
        BigDecimal basePrice = basePriceOf(item);
        BigDecimal unitPrice = basePrice;
        if (item.getProductFrameOption() != null) {
            unitPrice = unitPrice.add(item.getProductFrameOption().getPriceAdjustment());
        }
        return new CartItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getSlug(),
                toVariantResponse(variant),
                basePrice,
                frameOption,
                item.getPageCount(),
                item.getPhotobookDesign() == null ? null : item.getPhotobookDesign().getId(),
                item.getPhotobookTemplateCode(),
                unitPrice,
                item.getQuantity(),
                unitPrice.multiply(BigDecimal.valueOf(item.getQuantity())));
    }

    private ProductVariant getSelectedVariant(Product product, UUID variantId) {
        boolean hasVariants = productVariantRepository.existsByProductId(product.getId());
        if (variantId == null) {
            if (hasVariants) throw new AppException(ErrorCode.PRODUCT_VARIANT_REQUIRED, "Select a product variant before adding this product to cart");
            return null;
        }
        return productVariantRepository.findByIdAndProductId(variantId, product.getId())
                .filter(variant -> variant.isAvailable() && variant.getStockQuantity() > 0)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_AVAILABLE, "Product variant is not available"));
    }

    private void validateFrameCompatibility(ProductFrameOption option, ProductVariant variant) {
        if (option == null || variant == null) return;
        boolean compatible = (option.getMinWidthCm() == null || variant.getWidthCm().compareTo(option.getMinWidthCm()) >= 0)
                && (option.getMaxWidthCm() == null || variant.getWidthCm().compareTo(option.getMaxWidthCm()) <= 0)
                && (option.getMinHeightCm() == null || variant.getHeightCm().compareTo(option.getMinHeightCm()) >= 0)
                && (option.getMaxHeightCm() == null || variant.getHeightCm().compareTo(option.getMaxHeightCm()) <= 0);
        if (!compatible) throw new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_AVAILABLE, "Frame is not compatible with the selected variant");
    }

    private ProductVariantResponse toVariantResponse(ProductVariant variant) {
        if (variant == null) return null;
        return new ProductVariantResponse(variant.getId(), variant.getProduct().getId(), variant.getSku(), variant.getName(), variant.getWidthCm(), variant.getHeightCm(), variant.getArtSize() == null ? null : variant.getArtSize().getId(), variant.getArtSize() == null ? "CUSTOM" : variant.getArtSize().getCode(), variant.getMaterialDefinition() == null ? null : variant.getMaterialDefinition().getId(), variant.getMaterial(), variant.getPrice(), variant.getStockQuantity(), variant.isAvailable());
    }
}
