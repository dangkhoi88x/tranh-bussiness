package com.example.businessstore.repository;

import com.example.businessstore.entity.OrderStatusHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, UUID> {
    @EntityGraph(attributePaths = "changedBy")
    List<OrderStatusHistory> findAllByOrderIdOrderByCreatedAtAsc(UUID orderId);

    @EntityGraph(attributePaths = "changedBy")
    List<OrderStatusHistory> findAllByOrderIdAndOrderUserIdOrderByCreatedAtAsc(UUID orderId, UUID userId);
}
