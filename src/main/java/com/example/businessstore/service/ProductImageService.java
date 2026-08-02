package com.example.businessstore.service;

import com.example.businessstore.dto.request.UpdateProductImageRequest;
import com.example.businessstore.dto.response.ProductImageResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ProductImageService {

    ProductImageResponse upload(UUID productId, MultipartFile file, String altText);

    List<ProductImageResponse> findPublishedByProductId(UUID productId);

    List<ProductImageResponse> findAllForManagement(UUID productId);

    ProductImageResponse update(UUID productId, UUID imageId, UpdateProductImageRequest request);

    void delete(UUID productId, UUID imageId);
}
