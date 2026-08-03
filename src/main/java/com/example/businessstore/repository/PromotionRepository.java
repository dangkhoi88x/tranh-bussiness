package com.example.businessstore.repository;

import com.example.businessstore.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    @EntityGraph(attributePaths = {"scopes", "scopes.category", "scopes.product", "scopes.productVariant"})
    Optional<Promotion> findByCodeIgnoreCase(String code);

    @EntityGraph(attributePaths = {"scopes", "scopes.category", "scopes.product", "scopes.productVariant"})
    @Query("select promotion from Promotion promotion where promotion.id = :id")
    Optional<Promotion> findWithScopesById(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"scopes", "scopes.category", "scopes.product", "scopes.productVariant"})
    @Query("""
            select promotion from Promotion promotion
            where (:code is null or lower(promotion.code) like lower(concat('%', :code, '%')))
              and (:status is null or promotion.status = :status)
              and (:effectiveFrom is null or promotion.endAt >= :effectiveFrom)
              and (:effectiveToExclusive is null or promotion.startAt < :effectiveToExclusive)
            """)
    Page<Promotion> searchForManagement(
            @Param("code") String code,
            @Param("status") com.example.businessstore.constant.PromotionStatus status,
            @Param("effectiveFrom") Instant effectiveFrom,
            @Param("effectiveToExclusive") Instant effectiveToExclusive,
            Pageable pageable);

    @Modifying
    @Query(value = """
            UPDATE promotions
               SET reserved_count = reserved_count + 1,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = :promotionId
               AND status = 'ACTIVE'
               AND start_at <= :now
               AND end_at > :now
               AND (usage_limit = 0 OR reserved_count + used_count < usage_limit)
            """, nativeQuery = true)
    int reserveQuota(@Param("promotionId") UUID promotionId, @Param("now") Instant now);

    @Modifying
    @Query(value = """
            UPDATE promotions
               SET reserved_count = reserved_count - 1,
                   used_count = used_count + 1,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = :promotionId
               AND reserved_count > 0
            """, nativeQuery = true)
    int consumeReservedQuota(@Param("promotionId") UUID promotionId);

    @Modifying
    @Query(value = """
            UPDATE promotions
               SET reserved_count = reserved_count - 1,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = :promotionId
               AND reserved_count > 0
            """, nativeQuery = true)
    int releaseReservedQuota(@Param("promotionId") UUID promotionId);

    @Modifying
    @Query(value = """
            UPDATE promotions
               SET used_count = used_count - 1,
                   updated_at = CURRENT_TIMESTAMP
             WHERE id = :promotionId
               AND used_count > 0
            """, nativeQuery = true)
    int releaseConsumedQuota(@Param("promotionId") UUID promotionId);

    @Modifying
    @Query("""
            update Promotion promotion
               set promotion.status = com.example.businessstore.constant.PromotionStatus.EXPIRED
             where promotion.status = com.example.businessstore.constant.PromotionStatus.ACTIVE
               and promotion.endAt <= :now
            """)
    int markEndedPromotionsExpired(@Param("now") Instant now);
}
