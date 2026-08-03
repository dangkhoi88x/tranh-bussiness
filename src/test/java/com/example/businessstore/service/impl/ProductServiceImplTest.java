package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductCatalogSort;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.dto.response.ProductResponse;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Product;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.ProductMapper;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductImageRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceImplTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductImageRepository productImageRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ProductMapper productMapper;
    @Mock private MediaTransactionSynchronizer mediaTransactionSynchronizer;
    @InjectMocks private ProductServiceImpl productService;

    private Product product;
    private ProductResponse productResponse;

    @BeforeEach
    void setUp() {
        Category category = new Category();
        category.setId(UUID.randomUUID());
        category.setName("Phong cảnh");
        product = new Product();
        product.setId(UUID.randomUUID());
        product.setCategory(category);
        product.setName("Tranh sơn dầu");
        product.setSlug("tranh-son-dau");
        product.setPrice(new BigDecimal("750000"));
        product.setStockQuantity(2);
        product.setStatus(ProductStatus.PUBLISHED);
        productResponse = new ProductResponse(product.getId(), category.getId(), category.getName(),
                product.getName(), product.getSlug(), null, product.getPrice(), null, null,
                product.getStockQuantity(), product.getStatus(), null, null);
    }

    @Test
    void findPublished_usesSpecificationAndLetsCatalogCriteriaOwnTheSort() {
        when(productRepository.findAll(ArgumentMatchers.<Specification<Product>>any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(product)));
        when(productMapper.toResponse(product)).thenReturn(productResponse);

        var response = productService.findPublished(new ProductCatalogFilter(null, " sơn dầu ",
                new BigDecimal("500000"), new BigDecimal("1000000"), "Canvas",
                new BigDecimal("60"), new BigDecimal("90"), ProductCatalogSort.PRICE_ASC), 0, 500);

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(productRepository).findAll(ArgumentMatchers.<Specification<Product>>any(), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
        assertThat(pageable.getValue().getSort().isUnsorted()).isTrue();
        assertThat(response.items()).containsExactly(productResponse);
    }

    @Test
    void findPublished_rejectsInvalidPriceRangeBeforeQueryingDatabase() {
        ProductCatalogFilter filter = new ProductCatalogFilter(null, null,
                new BigDecimal("1000000"), new BigDecimal("500000"), null, null, null, null);

        assertThatThrownBy(() -> productService.findPublished(filter, 1, 12))
                .isInstanceOfSatisfying(AppException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.INVALID_PRODUCT_CATALOG_FILTER));

        verify(productRepository, never()).findAll(
                ArgumentMatchers.<Specification<Product>>any(), any(Pageable.class));
    }
}
