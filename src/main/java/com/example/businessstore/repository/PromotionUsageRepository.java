package com.example.businessstore.repository;

import com.example.businessstore.constant.PromotionUsageStatus;
import com.example.businessstore.entity.PromotionUsage;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PromotionUsageRepository extends JpaRepository<PromotionUsage, UUID> {

    boolean existsByPromotionId(UUID promotionId);

    long countByPromotionIdAndUserIdAndStatusIn(
            UUID promotionId,
            UUID userId,
            Collection<PromotionUsageStatus> statuses);

    @EntityGraph(attributePaths = {"promotion", "user", "order"})
    Optional<PromotionUsage> findByOrderId(UUID orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"promotion", "user", "order"})
    @Query("select usage from PromotionUsage usage where usage.order.id = :orderId")
    Optional<PromotionUsage> findByOrderIdForUpdate(@Param("orderId") UUID orderId);

    @EntityGraph(attributePaths = {"promotion", "user", "order"})
    Page<PromotionUsage> findAllByPromotionId(UUID promotionId, Pageable pageable);

    @EntityGraph(attributePaths = "order")
    List<PromotionUsage> findTop100ByStatusAndExpiresAtBeforeOrderByExpiresAtAsc(
            PromotionUsageStatus status,
            Instant expiresAt);
}
