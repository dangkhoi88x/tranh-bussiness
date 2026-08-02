package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.UpdateProductImageRequest;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductImage;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.mapper.ProductImageMapper;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductImageServiceImplTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductImageRepository productImageRepository;
    @Mock
    private ProductImageMapper productImageMapper;
    @Mock
    private MediaStorageService mediaStorageService;
    @Mock
    private MediaTransactionSynchronizer mediaTransactionSynchronizer;

    @InjectMocks
    private ProductImageServiceImpl productImageService;

    @Test
    void settingTheCurrentPrimaryImageKeepsItPrimary() {
        UUID productId = UUID.randomUUID();
        UUID imageId = UUID.randomUUID();
        ProductImage image = image(productId, imageId, true);
        when(productRepository.findById(productId)).thenReturn(Optional.of(image.getProduct()));
        when(productImageRepository.findById(imageId)).thenReturn(Optional.of(image));

        productImageService.update(productId, imageId, new UpdateProductImageRequest(null, null, true));

        verify(productImageRepository).clearOtherPrimaryImages(productId, imageId);
        verify(productImageMapper).toResponse(image);
    }

    @Test
    void cannotUnsetTheOnlyPrimaryImage() {
        UUID productId = UUID.randomUUID();
        UUID imageId = UUID.randomUUID();
        ProductImage image = image(productId, imageId, true);
        when(productRepository.findById(productId)).thenReturn(Optional.of(image.getProduct()));
        when(productImageRepository.findById(imageId)).thenReturn(Optional.of(image));

        assertThatThrownBy(() -> productImageService.update(
                productId,
                imageId,
                new UpdateProductImageRequest(null, null, false)))
                .isInstanceOf(AppException.class);

        verify(productImageRepository, never()).clearOtherPrimaryImages(productId, imageId);
    }

    @Test
    void deletingAnImageSchedulesCloudinaryCleanupAfterCommit() {
        UUID productId = UUID.randomUUID();
        UUID imageId = UUID.randomUUID();
        ProductImage image = image(productId, imageId, false);
        image.setPublicId("business-store/products/image-1");
        when(productRepository.findById(productId)).thenReturn(Optional.of(image.getProduct()));
        when(productImageRepository.findById(imageId)).thenReturn(Optional.of(image));

        productImageService.delete(productId, imageId);

        verify(productImageRepository).delete(image);
        verify(productImageRepository).flush();
        verify(mediaTransactionSynchronizer).deleteAfterCommit("business-store/products/image-1");
    }

    private ProductImage image(UUID productId, UUID imageId, boolean primary) {
        Product product = new Product();
        product.setId(productId);
        ProductImage image = new ProductImage();
        image.setId(imageId);
        image.setProduct(product);
        image.setPrimaryImage(primary);
        return image;
    }
}
