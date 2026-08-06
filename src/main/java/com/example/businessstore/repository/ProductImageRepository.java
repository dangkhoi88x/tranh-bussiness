package com.example.businessstore.repository;

import com.example.businessstore.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductImageRepository extends JpaRepository<ProductImage, UUID> {

    List<ProductImage> findAllByProductIdOrderBySortOrderAscCreatedAtAsc(UUID productId);

    List<ProductImage> findAllByProductIdInOrderByProductIdAscPrimaryImageDescSortOrderAscCreatedAtAsc(List<UUID> productIds);

    boolean existsByProductIdAndPrimaryImageTrue(UUID productId);

    Optional<ProductImage> findFirstByProductIdAndPrimaryImageTrueOrderByCreatedAtAsc(UUID productId);

    Optional<ProductImage> findTopByProductIdOrderBySortOrderDesc(UUID productId);

    Optional<ProductImage> findFirstByProductIdOrderBySortOrderAscCreatedAtAsc(UUID productId);

    Optional<ProductImage> findFirstByProductIdAndIdNotOrderBySortOrderAscCreatedAtAsc(UUID productId, UUID imageId);

    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE ProductImage image
            SET image.primaryImage = false
            WHERE image.product.id = :productId
              AND image.id <> :imageId
              AND image.primaryImage = true
            """)
    void clearOtherPrimaryImages(@Param("productId") UUID productId, @Param("imageId") UUID imageId);
}
