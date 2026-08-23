package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.UpdateProductImageRequest;
import com.example.businessstore.dto.response.ProductImageResponse;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductImage;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductImageMapper;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.service.ProductImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductImageServiceImpl implements ProductImageService {

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductImageMapper productImageMapper;
    private final MediaStorageService mediaStorageService;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;

    @Override
    @Transactional
    public ProductImageResponse upload(UUID productId, MultipartFile file, String altText) {
        Product product = getProduct(productId);
        MediaStorageService.UploadedMedia uploaded = mediaStorageService.uploadProductImage(productId, file);
        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setPublicId(uploaded.publicId());
        image.setSecureUrl(uploaded.secureUrl());
        image.setAltText(normalizeAltText(altText));
        image.setSortOrder(nextSortOrder(productId));
        image.setPrimaryImage(!productImageRepository.existsByProductIdAndPrimaryImageTrue(productId));
        try {
            ProductImage savedImage = productImageRepository.save(image);
            mediaTransactionSynchronizer.deleteAfterRollback(uploaded.publicId());
            return productImageMapper.toResponse(savedImage);
        } catch (RuntimeException exception) {
            mediaTransactionSynchronizer.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductImageResponse> findPublishedByProductId(UUID productId) {
        Product product = productRepository.findById(productId)
                .filter(item -> item.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm."));
        return findImages(product.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductImageResponse> findAllForManagement(UUID productId) {
        getProduct(productId);
        return findImages(productId);
    }

    @Override
    @Transactional
    public ProductImageResponse update(UUID productId, UUID imageId, UpdateProductImageRequest request) {
        getProduct(productId);
        ProductImage image = getProductImage(productId, imageId);
        if (request.primaryImage() != null) {
            if (request.primaryImage()) {
                productImageRepository.clearOtherPrimaryImages(productId, imageId);
                image.setPrimaryImage(true);
            } else if (!image.isPrimaryImage()) {
                image.setPrimaryImage(false);
            } else {
                throw new AppException(
                        ErrorCode.INVALID_REQUEST,
                        "Hãy chọn ảnh khác làm ảnh chính trước khi bỏ ảnh chính hiện tại.");
            }
        }
        if (request.sortOrder() != null) {
            image.setSortOrder(request.sortOrder());
        }
        if (request.altText() != null) {
            image.setAltText(normalizeAltText(request.altText()));
        }
        return productImageMapper.toResponse(image);
    }

    @Override
    @Transactional
    public void delete(UUID productId, UUID imageId) {
        getProduct(productId);
        ProductImage image = getProductImage(productId, imageId);
        boolean wasPrimaryImage = image.isPrimaryImage();
        productImageRepository.delete(image);
        productImageRepository.flush();
        if (wasPrimaryImage) {
            productImageRepository.findFirstByProductIdOrderBySortOrderAscCreatedAtAsc(productId)
                    .ifPresent(nextPrimaryImage -> nextPrimaryImage.setPrimaryImage(true));
        }
        mediaTransactionSynchronizer.deleteAfterCommit(image.getPublicId());
    }

    private List<ProductImageResponse> findImages(UUID productId) {
        return productImageRepository.findAllByProductIdOrderBySortOrderAscCreatedAtAsc(productId).stream()
                .map(productImageMapper::toResponse)
                .toList();
    }

    private Product getProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm."));
    }

    private ProductImage getProductImage(UUID productId, UUID imageId) {
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_IMAGE_NOT_FOUND, "Không tìm thấy ảnh sản phẩm."));
        if (!image.getProduct().getId().equals(productId)) {
            throw new AppException(ErrorCode.PRODUCT_IMAGE_NOT_FOUND, "Không tìm thấy ảnh sản phẩm.");
        }
        return image;
    }

    private int nextSortOrder(UUID productId) {
        return productImageRepository.findTopByProductIdOrderBySortOrderDesc(productId)
                .map(image -> image.getSortOrder() + 1)
                .orElse(0);
    }

    private String normalizeAltText(String altText) {
        return altText == null || altText.isBlank() ? null : altText.trim();
    }
}
