package com.example.businessstore.repository;

import com.example.businessstore.entity.WishlistItem;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WishlistItemRepository extends JpaRepository<WishlistItem, UUID> {

    @EntityGraph(attributePaths = {"product", "product.category", "productVariant"})
    List<WishlistItem> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = {"product", "product.category", "productVariant"})
    Optional<WishlistItem> findByUserIdAndProductIdAndProductVariantIsNull(UUID userId, UUID productId);

    @EntityGraph(attributePaths = {"product", "product.category", "productVariant"})
    Optional<WishlistItem> findByUserIdAndProductIdAndProductVariantId(UUID userId, UUID productId, UUID productVariantId);

    Optional<WishlistItem> findByIdAndUserId(UUID id, UUID userId);

    @Modifying(flushAutomatically = true)
    @Query(value = """
            INSERT INTO wishlist_items (id, created_at, updated_at, user_id, product_id, product_variant_id)
            VALUES (:id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :userId, :productId, CAST(:productVariantId AS UUID))
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id,
                       @Param("userId") UUID userId,
                       @Param("productId") UUID productId,
                       @Param("productVariantId") UUID productVariantId);
}
