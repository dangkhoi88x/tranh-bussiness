package com.example.businessstore.repository;

import com.example.businessstore.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    @EntityGraph(attributePaths = "items") Page<Order> findByUserId(UUID userId, Pageable pageable);
    @EntityGraph(attributePaths = "items") Optional<Order> findByIdAndUserId(UUID id, UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id") Optional<Order> findByIdForUpdate(UUID id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Order o where o.id = :id and o.user.id = :userId") Optional<Order> findByIdAndUserIdForUpdate(UUID id, UUID userId);
    boolean existsByOrderCode(String orderCode);
}
