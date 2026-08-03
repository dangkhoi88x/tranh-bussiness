package com.example.businessstore.dto.request;

import com.example.businessstore.constant.ProductCatalogSort;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Query criteria accepted by the public product catalogue.
 */
public record ProductCatalogFilter(
        UUID categoryId,
        String keyword,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String material,
        BigDecimal widthCm,
        BigDecimal heightCm,
        ProductCatalogSort sort) {

    public ProductCatalogFilter {
        keyword = normalize(keyword);
        material = normalize(material);
        sort = sort == null ? ProductCatalogSort.NEWEST : sort;
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().replaceAll("\\s+", " ");
    }
}
