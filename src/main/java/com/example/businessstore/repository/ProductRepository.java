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
import org.springframework.data.jpa.domain.Specification;

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

    @Override
    @EntityGraph(attributePaths = "category")
    Page<Product> findAll(Specification<Product> specification, Pageable pageable);

    @Query("""
            select product from Product product
            join fetch product.category
            where product.status = :status
              and product.stockQuantity <= :stockQuantity
              and not exists (select variant.id from ProductVariant variant where variant.product = product)
            order by product.stockQuantity asc, product.name asc
            """)
    List<Product> findBaseProductsByStatusAndStockQuantityLessThanEqual(
            @Param("status") ProductStatus status,
            @Param("stockQuantity") int stockQuantity,
            Pageable pageable);

    @Query("""
            select count(product) from Product product
            where product.status = :status
              and product.stockQuantity <= :stockQuantity
              and not exists (select variant.id from ProductVariant variant where variant.product = product)
            """)
    long countBaseProductsByStatusAndStockQuantityLessThanEqual(
            @Param("status") ProductStatus status,
            @Param("stockQuantity") int stockQuantity);
}
