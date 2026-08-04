package com.example.businessstore.repository;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.EntityGraph;
public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findAllByProductIdOrderByPriceAsc(UUID productId);
    List<ProductVariant> findAllByProductIdAndAvailableTrueOrderByPriceAsc(UUID productId);
    List<ProductVariant> findAllByProductIdIn(Collection<UUID> productIds);
    Optional<ProductVariant> findByIdAndProductId(UUID id, UUID productId);
    boolean existsByProductId(UUID productId);
    boolean existsBySku(String sku);
    boolean existsBySkuAndIdNot(String sku, UUID id);
    long countByProductStatusAndAvailableTrueAndStockQuantityLessThanEqual(ProductStatus status, int stockQuantity);
    @EntityGraph(attributePaths = {"product", "product.category"})
    List<ProductVariant> findTop6ByProductStatusAndAvailableTrueAndStockQuantityLessThanEqualOrderByStockQuantityAscProductNameAsc(ProductStatus status, int stockQuantity);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select variant from ProductVariant variant where variant.id = :id") Optional<ProductVariant> findByIdForUpdate(UUID id);
}
