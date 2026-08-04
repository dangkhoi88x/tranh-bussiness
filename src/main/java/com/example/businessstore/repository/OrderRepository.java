package com.example.businessstore.repository;

import com.example.businessstore.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.example.businessstore.constant.OrderStatus;
import java.time.Instant;
import java.util.List;
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

    @EntityGraph(attributePaths = {"items", "user"})
    @Query("""
            select o from Order o join o.user customer
            where lower(o.orderCode) like concat('%', lower(coalesce(cast(:orderCode as string), o.orderCode)), '%')
              and o.status = coalesce(:status, o.status)
              and (lower(customer.email) like concat('%', lower(coalesce(cast(:customerQuery as string), customer.email)), '%')
                   or lower(customer.firstName) like concat('%', lower(coalesce(cast(:customerQuery as string), customer.firstName)), '%')
                   or lower(customer.lastName) like concat('%', lower(coalesce(cast(:customerQuery as string), customer.lastName)), '%'))
              and o.createdAt >= :createdFrom
              and o.createdAt < :createdToExclusive
            """)
    Page<Order> searchForManagement(
            @Param("orderCode") String orderCode,
            @Param("status") OrderStatus status,
            @Param("customerQuery") String customerQuery,
            @Param("createdFrom") Instant createdFrom,
            @Param("createdToExclusive") Instant createdToExclusive,
            Pageable pageable);

    @Query("select count(o) from Order o where o.createdAt >= :from and o.createdAt < :toExclusive")
    long countCreatedBetween(@Param("from") Instant from, @Param("toExclusive") Instant toExclusive);

    @Query("select o.status, count(o) from Order o where o.createdAt >= :from and o.createdAt < :toExclusive group by o.status")
    List<Object[]> countCreatedByStatusBetween(@Param("from") Instant from, @Param("toExclusive") Instant toExclusive);

    @Query(value = """
            select (created_at at time zone 'Asia/Ho_Chi_Minh')::date, count(*)
            from orders
            where created_at >= :from and created_at < :toExclusive
            group by 1 order by 1
            """, nativeQuery = true)
    List<Object[]> countCreatedByDayBetween(@Param("from") Instant from, @Param("toExclusive") Instant toExclusive);
}
