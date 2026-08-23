package com.example.businessstore.service.impl;

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
import com.example.businessstore.repository.PhotobookTemplateRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.CartService;
import com.example.businessstore.service.ProductSelectionPricingService;
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
    private final PhotobookDesignRepository photobookDesignRepository;
    private final PhotobookTemplateRepository photobookTemplateRepository;
    private final ProductSelectionPricingService selectionPricingService;

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
        selectionPricingService.validateFrameCompatibility(frameOption, variant);
        ProductSelectionPricingService.SelectionQuote quote = selectionPricingService
                .quote(product, variant, frameOption, request.pageCount());
        Integer pageCount = quote.pageCount();
        PhotobookDesign design = resolveDesign(userId, product, pageCount, request.photobookDesignId());
        String templateCode = resolveTemplateCode(product, pageCount, request.photobookTemplateCode());

        CartItem item = findExistingItem(cart, product.getId(), variant == null ? null : variant.getId(), frameOption == null ? null : frameOption.getId(), pageCount, design == null ? null : design.getId(), templateCode)
                .orElseGet(() -> createItem(cart, product, variant, frameOption, pageCount, design, templateCode));
        int requestedQuantity = item.getQuantity() + request.quantity();
        selectionPricingService.requireAvailableStock(product, variant, requestedQuantity);
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
            selectionPricingService.validateFrameCompatibility(frameOption, variant);
        }
        selectionPricingService.requireAvailableStock(product, variant, request.quantity());
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
                    .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy tài khoản của phiên đăng nhập này."));
            Cart cart = new Cart();
            cart.setUser(user);
            return cartRepository.save(cart);
        });
    }

    private Product getPurchasableProduct(UUID productId) {
        return productRepository.findById(productId)
                .filter(product -> product.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE, "Sản phẩm này hiện không bán."));
    }

    private ProductFrameOption getAvailableFrameOption(UUID productId, UUID optionId) {
        ProductFrameOption option = productFrameOptionRepository.findByIdAndProductId(optionId, productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_FRAME_OPTION_NOT_FOUND, "Không tìm thấy lựa chọn khung của sản phẩm."));
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
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_DESIGN_NOT_FOUND, "Không tìm thấy thiết kế photobook."));
        if (!design.getProductSlug().equals(product.getSlug())
                || pageCount == null || design.getPageCount() != pageCount) {
            throw new AppException(ErrorCode.PHOTOBOOK_DESIGN_MISMATCH,
                    "Thiết kế không khớp với sản phẩm hoặc số trang đã chọn.");
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
                    "Sản phẩm này không bán kèm mẫu photobook.");
        }
        // Lọc theo active: chủ đề đã ẩn khỏi thư viện thì khách không chọn mới được nữa, dù cuốn
        // đã đặt theo nó trước đó vẫn dựng bình thường.
        return photobookTemplateRepository.findByCodeAndActiveTrue(requested)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_TEMPLATE_NOT_FOUND,
                        "Không tìm thấy mẫu photobook: " + requested))
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

    private CartItem getOwnedItem(UUID userId, UUID itemId) {
        return cartItemRepository.findByIdAndCartUserId(itemId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.CART_ITEM_NOT_FOUND, "Không tìm thấy sản phẩm này trong giỏ hàng."));
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
        ProductSelectionPricingService.SelectionQuote quote = selectionPricingService.quote(
                item.getProduct(), variant, item.getProductFrameOption(), item.getPageCount());
        BigDecimal basePrice = quote.basePrice();
        BigDecimal unitPrice = quote.unitPrice();
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
            if (hasVariants) throw new AppException(ErrorCode.PRODUCT_VARIANT_REQUIRED, "Hãy chọn phiên bản sản phẩm trước khi thêm vào giỏ.");
            return null;
        }
        return productVariantRepository.findByIdAndProductId(variantId, product.getId())
                .filter(variant -> variant.isAvailable() && variant.getStockQuantity() > 0)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_AVAILABLE, "Phiên bản sản phẩm này hiện không bán."));
    }

    private ProductVariantResponse toVariantResponse(ProductVariant variant) {
        if (variant == null) return null;
        return new ProductVariantResponse(variant.getId(), variant.getProduct().getId(), variant.getSku(), variant.getName(), variant.getWidthCm(), variant.getHeightCm(), variant.getArtSize() == null ? null : variant.getArtSize().getId(), variant.getArtSize() == null ? "CUSTOM" : variant.getArtSize().getCode(), variant.getMaterialDefinition() == null ? null : variant.getMaterialDefinition().getId(), variant.getMaterial(), variant.getPrice(), variant.getStockQuantity(), variant.isAvailable());
    }
}
