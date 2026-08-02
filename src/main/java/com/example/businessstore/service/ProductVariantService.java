package com.example.businessstore.service;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.*;
import java.util.*;
public interface ProductVariantService { ProductVariantResponse create(UUID productId, CreateProductVariantRequest request); List<ProductVariantResponse> findPublished(UUID productId); List<ProductVariantResponse> findAllForManagement(UUID productId); ProductVariantResponse update(UUID productId, UUID variantId, UpdateProductVariantRequest request); void delete(UUID productId, UUID variantId); }
