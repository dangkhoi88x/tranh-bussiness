package com.example.businessstore.repository;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByIdAndOrderUserId(UUID id, UUID userId);
    Page<Payment> findByOrderUserId(UUID userId, Pageable pageable);
    boolean existsByOrderIdAndStatus(UUID orderId, PaymentStatus status);
    Optional<Payment> findByOrderIdAndMethodAndStatus(UUID orderId, com.example.businessstore.constant.PaymentMethod method, PaymentStatus status);
    Optional<Payment> findByOrderIdAndStatus(UUID orderId, PaymentStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id") Optional<Payment> findByIdForUpdate(UUID id);
    boolean existsByTransactionCode(String transactionCode);
    long countByStatus(PaymentStatus status);

    @EntityGraph(attributePaths = "order")
    @Query("""
            select payment from Payment payment
            where (:status is null or payment.status = :status)
              and (:orderCode is null or lower(payment.order.orderCode) like lower(concat('%', :orderCode, '%')))
              and (:createdFrom is null or payment.createdAt >= :createdFrom)
              and (:createdToExclusive is null or payment.createdAt < :createdToExclusive)
            """)
    Page<Payment> searchForManagement(
            @Param("status") PaymentStatus status,
            @Param("orderCode") String orderCode,
            @Param("createdFrom") Instant createdFrom,
            @Param("createdToExclusive") Instant createdToExclusive,
            Pageable pageable);

    @Query("select sum(p.amount) from Payment p where p.status = :status")
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);

    @Query("select sum(p.amount) from Payment p where p.status = :status and p.paidAt >= :from and p.paidAt < :toExclusive")
    BigDecimal sumAmountByStatusAndPaidAtBetween(@Param("status") PaymentStatus status, @Param("from") Instant from, @Param("toExclusive") Instant toExclusive);

    @Query(value = """
            select (paid_at at time zone 'Asia/Ho_Chi_Minh')::date, sum(amount)
            from payments
            where status = 'SUCCESS' and paid_at >= :from and paid_at < :toExclusive
            group by 1 order by 1
            """, nativeQuery = true)
    List<Object[]> sumSuccessfulAmountByPaidDayBetween(@Param("from") Instant from, @Param("toExclusive") Instant toExclusive);
}
