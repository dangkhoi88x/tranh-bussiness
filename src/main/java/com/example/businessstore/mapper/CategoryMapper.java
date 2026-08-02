package com.example.businessstore.mapper;

import com.example.businessstore.dto.response.CategoryResponse;
import com.example.businessstore.entity.Category;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryResponse toResponse(Category category);
}
