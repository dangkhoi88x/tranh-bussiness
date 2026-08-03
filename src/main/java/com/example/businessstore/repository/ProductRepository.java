package com.example.businessstore.repository;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    boolean existsByCategoryId(UUID categoryId);

    Optional<Product> findBySlugAndStatus(String slug, ProductStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select product from Product product where product.id = :id")
    Optional<Product> findByIdForUpdate(UUID id);

    Page<Product> findAllByStatusOrderByCreatedAtDesc(ProductStatus status, Pageable pageable);

    Page<Product> findAllByCategoryIdAndStatusOrderByCreatedAtDesc(UUID categoryId, ProductStatus status, Pageable pageable);

    @EntityGraph(attributePaths = "category")
    @Query("""
            select product from Product product
            where (:name is null or lower(product.name) like lower(concat('%', :name, '%')))
              and (:categoryId is null or product.category.id = :categoryId)
              and (:status is null or product.status = :status)
              and (:minStock is null or product.stockQuantity >= :minStock)
              and (:maxStock is null or product.stockQuantity <= :maxStock)
            """)
    Page<Product> searchForManagement(
            @Param("name") String name,
            @Param("categoryId") UUID categoryId,
            @Param("status") ProductStatus status,
            @Param("minStock") Integer minStock,
            @Param("maxStock") Integer maxStock,
            Pageable pageable);

    long countByStatusAndStockQuantityLessThanEqual(ProductStatus status, int stockQuantity);

    List<Product> findTop6ByStatusAndStockQuantityLessThanEqualOrderByStockQuantityAscNameAsc(ProductStatus status, int stockQuantity);
}
