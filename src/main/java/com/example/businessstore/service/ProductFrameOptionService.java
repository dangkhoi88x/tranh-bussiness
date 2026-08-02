package com.example.businessstore.service;

import com.example.businessstore.dto.request.CreateProductFrameOptionRequest;
import com.example.businessstore.dto.request.UpdateProductFrameOptionRequest;
import com.example.businessstore.dto.response.ProductFrameOptionResponse;

import java.util.List;
import java.util.UUID;

public interface ProductFrameOptionService {

    ProductFrameOptionResponse create(UUID productId, CreateProductFrameOptionRequest request);

    List<ProductFrameOptionResponse> findPublishedByProductId(UUID productId);

    List<ProductFrameOptionResponse> findAllForManagement(UUID productId);

    ProductFrameOptionResponse update(UUID productId, UUID optionId, UpdateProductFrameOptionRequest request);

    void delete(UUID productId, UUID optionId);
}
