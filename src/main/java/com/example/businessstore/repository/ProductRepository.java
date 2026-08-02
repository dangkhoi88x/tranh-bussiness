package com.example.businessstore.repository;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    boolean existsByCategoryId(UUID categoryId);

    Optional<Product> findBySlugAndStatus(String slug, ProductStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select product from Product product where product.id = :id")
    Optional<Product> findByIdForUpdate(UUID id);

    Page<Product> findAllByStatusOrderByCreatedAtDesc(ProductStatus status, Pageable pageable);

    Page<Product> findAllByCategoryIdAndStatusOrderByCreatedAtDesc(UUID categoryId, ProductStatus status, Pageable pageable);
}
