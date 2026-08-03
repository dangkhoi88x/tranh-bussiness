package com.example.businessstore.service;

import com.example.businessstore.dto.request.CreateProductRequest;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.dto.request.UpdateProductRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.constant.ProductStockLevel;

import java.util.UUID;

public interface ProductService {

    ProductResponse create(CreateProductRequest request);

    ProductResponse update(UUID id, UpdateProductRequest request);

    void delete(UUID id);

    PageResponse<ProductResponse> findPublished(ProductCatalogFilter filter, int page, int size);

    default PageResponse<ProductResponse> findPublished(UUID categoryId, int page, int size) {
        return findPublished(new ProductCatalogFilter(categoryId, null, null, null, null, null, null, null), page, size);
    }

    ProductResponse findPublishedById(UUID id);

    ProductResponse findPublishedBySlug(String slug);

    PageResponse<ProductResponse> findAllForManagement(UUID categoryId, String name, ProductStatus status, ProductStockLevel stockLevel, int page, int size);

    ProductResponse findForManagement(UUID id);
}
