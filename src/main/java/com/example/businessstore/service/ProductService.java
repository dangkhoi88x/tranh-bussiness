package com.example.businessstore.service;

import com.example.businessstore.dto.request.CreateProductRequest;
import com.example.businessstore.dto.request.UpdateProductRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.ProductResponse;

import java.util.UUID;

public interface ProductService {

    ProductResponse create(CreateProductRequest request);

    ProductResponse update(UUID id, UpdateProductRequest request);

    void delete(UUID id);

    PageResponse<ProductResponse> findPublished(UUID categoryId, int page, int size);

    ProductResponse findPublishedById(UUID id);

    ProductResponse findPublishedBySlug(String slug);

    PageResponse<ProductResponse> findAllForManagement(int page, int size);

    ProductResponse findForManagement(UUID id);
}
