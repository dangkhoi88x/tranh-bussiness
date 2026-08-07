package com.example.businessstore.mapper;

import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.entity.Product;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(target = "categoryId", source = "category.id")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "effectiveStockQuantity", source = "stockQuantity")
    @Mapping(target = "hasVariants", constant = "false")
    @Mapping(target = "primaryImageUrl", ignore = true)
    @Mapping(target = "images", ignore = true)
    ProductResponse toResponse(Product product);
}
