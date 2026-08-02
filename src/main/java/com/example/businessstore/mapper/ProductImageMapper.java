package com.example.businessstore.mapper;

import com.example.businessstore.dto.response.ProductImageResponse;
import com.example.businessstore.entity.ProductImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ProductImageMapper {

    @Mapping(target = "productId", source = "product.id")
    ProductImageResponse toResponse(ProductImage productImage);
}
