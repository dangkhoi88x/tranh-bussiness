package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.CreateProductRequest;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.dto.request.UpdateProductRequest;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Product;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductMapper;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.specification.ProductCatalogSpecifications;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.service.ProductService;
import com.example.businessstore.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ProductRepository productRepository;
    private final ProductImageRepository productImageRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;

    @Override
    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        String name = normalizeName(request.name());
        Product product = new Product();
        product.setCategory(getCategory(request.categoryId()));
        product.setName(name);
        product.setSlug(generateUniqueSlug(name, null));
        product.setDescription(normalizeDescription(request.description()));
        product.setPrice(request.price());
        product.setWidthCm(request.widthCm());
        product.setHeightCm(request.heightCm());
        product.setStockQuantity(request.stockQuantity());
        product.setStatus(request.status() == null ? ProductStatus.DRAFT : request.status());
        return productMapper.toResponse(productRepository.save(product));
    }

    @Override
    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest request) {
        Product product = getProduct(id);
        if (request.categoryId() != null) {
            product.setCategory(getCategory(request.categoryId()));
        }
        if (request.name() != null) {
            String name = normalizeName(request.name());
            product.setName(name);
            product.setSlug(generateUniqueSlug(name, id));
        }
        if (request.description() != null) {
            product.setDescription(normalizeDescription(request.description()));
        }
        if (request.price() != null) {
            product.setPrice(request.price());
        }
        if (request.widthCm() != null) {
            product.setWidthCm(request.widthCm());
        }
        if (request.heightCm() != null) {
            product.setHeightCm(request.heightCm());
        }
        if (request.stockQuantity() != null) {
            product.setStockQuantity(request.stockQuantity());
        }
        if (request.status() != null) {
            product.setStatus(request.status());
        }
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Product product = getProduct(id);
        var publicIds = productImageRepository.findAllByProductIdOrderBySortOrderAscCreatedAtAsc(id).stream()
                .map(image -> image.getPublicId())
                .toList();
        productRepository.delete(product);
        publicIds.forEach(mediaTransactionSynchronizer::deleteAfterCommit);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> findPublished(ProductCatalogFilter filter, int page, int size) {
        ProductCatalogFilter validatedFilter = validateCatalogFilter(filter);
        Page<Product> products = productRepository.findAll(
                ProductCatalogSpecifications.published(validatedFilter), catalogPageRequest(page, size));
        return toPageResponse(products, page);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findPublishedById(UUID id) {
        Product product = productRepository.findById(id)
                .filter(item -> item.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findPublishedBySlug(String slug) {
        Product product = productRepository.findBySlugAndStatus(slug, ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
        return productMapper.toResponse(product);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> findAllForManagement(int page, int size) {
        return toPageResponse(productRepository.findAll(pageRequest(page, size)), page);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductResponse findForManagement(UUID id) {
        return productMapper.toResponse(getProduct(id));
    }

    private PageResponse<ProductResponse> toPageResponse(Page<Product> products, int requestedPage) {
        return new PageResponse<>(
                products.getContent().stream().map(productMapper::toResponse).toList(),
                Math.max(requestedPage, 1),
                products.getSize(),
                products.getTotalElements(),
                products.getTotalPages(),
                products.hasNext());
    }

    private Pageable pageRequest(int page, int size) {
        int pageNumber = Math.max(page, 1) - 1;
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private Pageable catalogPageRequest(int page, int size) {
        int pageNumber = Math.max(page, 1) - 1;
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        return PageRequest.of(pageNumber, pageSize);
    }

    private ProductCatalogFilter validateCatalogFilter(ProductCatalogFilter filter) {
        ProductCatalogFilter value = filter == null
                ? new ProductCatalogFilter(null, null, null, null, null, null, null, null)
                : filter;
        if (isNegative(value.minPrice()) || isNegative(value.maxPrice())
                || isNegative(value.widthCm()) || isNegative(value.heightCm())) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_CATALOG_FILTER,
                    "Price and dimensions must not be negative");
        }
        if (value.minPrice() != null && value.maxPrice() != null
                && value.minPrice().compareTo(value.maxPrice()) > 0) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_CATALOG_FILTER,
                    "minPrice must be less than or equal to maxPrice");
        }
        if (isZero(value.widthCm()) || isZero(value.heightCm())) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_CATALOG_FILTER,
                    "Dimensions must be greater than zero");
        }
        return value;
    }

    private boolean isNegative(BigDecimal value) {
        return value != null && value.signum() < 0;
    }

    private boolean isZero(BigDecimal value) {
        return value != null && value.signum() == 0;
    }

    private Category getCategory(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_FOUND, "Category not found"));
    }

    private Product getProduct(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
    }

    private String generateUniqueSlug(String name, UUID currentProductId) {
        String baseSlug = SlugUtils.toSlug(name);
        if (baseSlug.isBlank()) {
            throw new AppException(ErrorCode.INVALID_PRODUCT_NAME, "Product name must contain letters or numbers");
        }
        String slug = baseSlug;
        int suffix = 2;
        while (currentProductId == null ? productRepository.existsBySlug(slug) : productRepository.existsBySlugAndIdNot(slug, currentProductId)) {
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
