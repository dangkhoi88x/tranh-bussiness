package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.CreateProductVariantRequest;
import com.example.businessstore.dto.request.UpdateProductVariantRequest;
import com.example.businessstore.dto.response.ProductVariantResponse;
import com.example.businessstore.entity.Material;
import com.example.businessstore.entity.ArtSize;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.MaterialService;
import com.example.businessstore.service.ArtSizeService;
import com.example.businessstore.service.ProductVariantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ProductVariantServiceImpl implements ProductVariantService {
    private final ProductRepository productRepository; private final ProductVariantRepository variantRepository; private final MaterialService materialService; private final ArtSizeService artSizeService;
    @Override @Transactional public ProductVariantResponse create(UUID productId, CreateProductVariantRequest i) { if (variantRepository.existsBySku(i.sku().trim())) throw new AppException(ErrorCode.VARIANT_SKU_ALREADY_EXISTS, "Mã SKU này đã tồn tại."); ProductVariant v = new ProductVariant(); v.setProduct(product(productId)); apply(v, i.sku(), i.name(), i.widthCm(), i.heightCm(), artSizeService.requireActive(i.artSizeId()), materialService.requireActiveArtworkSurface(i.materialId()), i.price(), i.stockQuantity(), i.available() == null || i.available()); return toResponse(variantRepository.save(v)); }
    @Override @Transactional(readOnly = true) public List<ProductVariantResponse> findPublished(UUID productId) { productRepository.findById(productId).filter(p -> p.getStatus() == ProductStatus.PUBLISHED).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm.")); return variantRepository.findAllByProductIdAndAvailableTrueOrderByPriceAsc(productId).stream().map(this::toResponse).toList(); }
    @Override @Transactional(readOnly = true) public List<ProductVariantResponse> findAllForManagement(UUID productId) { product(productId); return variantRepository.findAllByProductIdOrderByPriceAsc(productId).stream().map(this::toResponse).toList(); }
    @Override @Transactional public ProductVariantResponse update(UUID productId, UUID variantId, UpdateProductVariantRequest i) { ProductVariant v = variantRepository.findByIdAndProductId(variantId, productId).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, "Không tìm thấy phiên bản sản phẩm.")); if (i.sku() != null) { String sku = i.sku().trim(); if (variantRepository.existsBySkuAndIdNot(sku, variantId)) throw new AppException(ErrorCode.VARIANT_SKU_ALREADY_EXISTS, "Mã SKU này đã tồn tại."); v.setSku(sku); } if (i.name() != null) v.setName(i.name().trim()); if (i.widthCm() != null) v.setWidthCm(i.widthCm()); if (i.heightCm() != null) v.setHeightCm(i.heightCm()); if (i.artSizeId() != null) v.setArtSize(artSizeService.requireActive(i.artSizeId())); ArtSize size=v.getArtSize(); if(size!=null) artSizeService.validateDimensions(size,v.getWidthCm(),v.getHeightCm()); if (i.materialId() != null) setMaterial(v, materialService.requireActiveArtworkSurface(i.materialId())); if (i.price() != null) v.setPrice(i.price()); if (i.stockQuantity() != null) v.setStockQuantity(i.stockQuantity()); if (i.available() != null) v.setAvailable(i.available()); return toResponse(v); }
    @Override @Transactional public void delete(UUID productId, UUID variantId) { variantRepository.delete(variantRepository.findByIdAndProductId(variantId, productId).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_VARIANT_NOT_FOUND, "Không tìm thấy phiên bản sản phẩm."))); }
    private Product product(UUID id) { return productRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm.")); }
    private void apply(ProductVariant v, String sku, String name, java.math.BigDecimal width, java.math.BigDecimal height, ArtSize artSize, Material material, java.math.BigDecimal price, int stock, boolean available) { v.setSku(sku.trim()); v.setName(name.trim()); v.setWidthCm(width); v.setHeightCm(height); artSizeService.validateDimensions(artSize,width,height); v.setArtSize(artSize); setMaterial(v, material); v.setPrice(price); v.setStockQuantity(stock); v.setAvailable(available); }
    private void setMaterial(ProductVariant variant, Material material) { variant.setMaterialDefinition(material); variant.setMaterial(material.getName()); }
    private ProductVariantResponse toResponse(ProductVariant v) { return new ProductVariantResponse(v.getId(), v.getProduct().getId(), v.getSku(), v.getName(), v.getWidthCm(), v.getHeightCm(), v.getArtSize() == null ? null : v.getArtSize().getId(), v.getArtSize() == null ? "CUSTOM" : v.getArtSize().getCode(), v.getMaterialDefinition() == null ? null : v.getMaterialDefinition().getId(), v.getMaterial(), v.getPrice(), v.getStockQuantity(), v.isAvailable()); }
}
