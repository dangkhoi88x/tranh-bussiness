package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.CreateCategoryRequest;
import com.example.businessstore.dto.request.UpdateCategoryRequest;
import com.example.businessstore.dto.response.CategoryResponse;
import com.example.businessstore.entity.Category;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.CategoryMapper;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.service.CategoryService;
import com.example.businessstore.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional
    public CategoryResponse create(CreateCategoryRequest request) {
        String name = normalizeName(request.name());
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(ErrorCode.CATEGORY_NAME_ALREADY_EXISTS, "Đã có danh mục dùng tên này.");
        }

        Category category = new Category();
        category.setName(name);
        category.setSlug(generateUniqueSlug(name));
        category.setDescription(normalizeDescription(request.description()));
        return categoryMapper.toResponse(categoryRepository.save(category));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> findAll() {
        return categoryRepository.findAllByOrderByNameAsc().stream()
                .map(categoryMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse findById(UUID id) {
        return categoryMapper.toResponse(getCategory(id));
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryResponse findBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND, "Không tìm thấy danh mục."));
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public CategoryResponse update(UUID id, UpdateCategoryRequest request) {
        Category category = getCategory(id);
        if (request.name() != null) {
            String name = normalizeName(request.name());
            if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
                throw new AppException(ErrorCode.CATEGORY_NAME_ALREADY_EXISTS, "Đã có danh mục dùng tên này.");
            }
            if (!category.getName().equalsIgnoreCase(name)) {
                category.setName(name);
                category.setSlug(generateUniqueSlug(name));
            }
        }
        if (request.description() != null) {
            category.setDescription(normalizeDescription(request.description()));
        }
        return categoryMapper.toResponse(category);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Category category = getCategory(id);
        if (productRepository.existsByCategoryId(id)) {
            throw new AppException(ErrorCode.CATEGORY_HAS_PRODUCTS, "Hãy xoá hoặc chuyển sản phẩm sang danh mục khác trước khi xoá danh mục này.");
        }
        categoryRepository.delete(category);
    }

    private Category getCategory(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND, "Không tìm thấy danh mục."));
    }

    private String generateUniqueSlug(String name) {
        String baseSlug = SlugUtils.toSlug(name);
        if (baseSlug.isBlank()) {
            throw new AppException(ErrorCode.INVALID_CATEGORY_NAME, "Tên danh mục phải có chữ hoặc số.");
        }

        String slug = baseSlug;
        int suffix = 2;
        while (categoryRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + suffix++;
        }
        return slug;
    }

    private String normalizeName(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDescription(String description) {
        return description == null || description.isBlank() ? null : description.trim();
    }
}
