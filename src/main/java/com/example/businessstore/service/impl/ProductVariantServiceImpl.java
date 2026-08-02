package com.example.businessstore.service.impl;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.ProductVariantResponse;
import com.example.businessstore.entity.*;
import com.example.businessstore.exception.*;
import com.example.businessstore.repository.*;
import com.example.businessstore.service.ProductVariantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service @RequiredArgsConstructor
public class ProductVariantServiceImpl implements ProductVariantService {
    private final ProductRepository productRepository; private final ProductVariantRepository variantRepository;
    @Override @Transactional public ProductVariantResponse create(UUID productId, CreateProductVariantRequest i) { if (variantRepository.existsBySku(i.sku().trim())) throw new AppException(ErrorCode.VARIANT_SKU_ALREADY_EXISTS, "SKU already exists"); ProductVariant v = new ProductVariant(); v.setProduct(product(productId)); apply(v, i.sku(), i.name(), i.widthCm(), i.heightCm(), i.material(), i.price(), i.stockQuantity(), i.available() == null || i.available()); return toResponse(variantRepository.save(v)); }
    @Override @Transactional(readOnly = true) public List<ProductVariantResponse> findPublished(UUID productId) { productRepository.findById(productId).filter(p -> p.getStatus() == ProductStatus.PUBLISHED).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found")); return variantRepository.findAllByProductIdAndAvailableTrueOrderByPriceAsc(productId).stream().map(this::toResponse).toList(); }
    @Override @Transactional(readOnly = true) public List<ProductVariantResponse> findAllForManagement(UUID productId) { product(productId); return variantRepository.findAllByProductIdOrderByPriceAsc(productId).stream().map(this::toResponse).toList(); }
    @Override @Transactional public ProductVariantResponse update(UUID productId, UUID variantId, UpdateProductVariantRequest i) { ProductVariant v = variantRepository.findByIdAndProductId(variantId, productId).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, "Product variant not found")); if (i.sku() != null) { String sku = i.sku().trim(); if (variantRepository.existsBySkuAndIdNot(sku, variantId)) throw new AppException(ErrorCode.VARIANT_SKU_ALREADY_EXISTS, "SKU already exists"); v.setSku(sku); } if (i.name() != null) v.setName(i.name().trim()); if (i.widthCm() != null) v.setWidthCm(i.widthCm()); if (i.heightCm() != null) v.setHeightCm(i.heightCm()); if (i.material() != null) v.setMaterial(i.material().trim()); if (i.price() != null) v.setPrice(i.price()); if (i.stockQuantity() != null) v.setStockQuantity(i.stockQuantity()); if (i.available() != null) v.setAvailable(i.available()); return toResponse(v); }
    @Override @Transactional public void delete(UUID productId, UUID variantId) { variantRepository.delete(variantRepository.findByIdAndProductId(variantId, productId).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, "Product variant not found"))); }
    private Product product(UUID id) { return productRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found")); }
    private void apply(ProductVariant v, String sku, String name, java.math.BigDecimal width, java.math.BigDecimal height, String material, java.math.BigDecimal price, int stock, boolean available) { v.setSku(sku.trim()); v.setName(name.trim()); v.setWidthCm(width); v.setHeightCm(height); v.setMaterial(material.trim()); v.setPrice(price); v.setStockQuantity(stock); v.setAvailable(available); }
    private ProductVariantResponse toResponse(ProductVariant v) { return new ProductVariantResponse(v.getId(), v.getProduct().getId(), v.getSku(), v.getName(), v.getWidthCm(), v.getHeightCm(), v.getMaterial(), v.getPrice(), v.getStockQuantity(), v.isAvailable()); }
}
