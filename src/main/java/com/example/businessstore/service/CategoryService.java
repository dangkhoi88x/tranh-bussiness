package com.example.businessstore.service;

import com.example.businessstore.dto.request.CreateCategoryRequest;
import com.example.businessstore.dto.request.UpdateCategoryRequest;
import com.example.businessstore.dto.response.CategoryResponse;

import java.util.List;
import java.util.UUID;

public interface CategoryService {

    CategoryResponse create(CreateCategoryRequest request);

    List<CategoryResponse> findAll();

    CategoryResponse findById(UUID id);

    CategoryResponse findBySlug(String slug);

    CategoryResponse update(UUID id, UpdateCategoryRequest request);

    void delete(UUID id);
}
