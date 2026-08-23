package com.example.businessstore.repository;

import com.example.businessstore.constant.RefundStatus;
import com.example.businessstore.entity.PaymentRefund;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {

    Optional<PaymentRefund> findByOrderId(UUID orderId);

    boolean existsByPaymentId(UUID paymentId);

    /** Khoá dòng khi tất toán để hai nhân viên bấm cùng lúc không ghi đè kết quả của nhau. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PaymentRefund r where r.id = :id")
    Optional<PaymentRefund> findByIdForUpdate(@Param("id") UUID id);

    // cast(... as string) là bắt buộc: bỏ trống ô lọc thì Postgres suy tham số null thành bytea
    // và lower() nổ ngay. Cùng khuôn với PaymentRepository.searchForManagement.
    @EntityGraph(attributePaths = {"order", "payment"})
    @Query("""
            select refund from PaymentRefund refund
            where refund.status = coalesce(:status, refund.status)
              and lower(refund.order.orderCode)
                  like concat('%', lower(coalesce(cast(:orderCode as string), refund.order.orderCode)), '%')
            """)
    Page<PaymentRefund> searchForManagement(
            @Param("status") RefundStatus status,
            @Param("orderCode") String orderCode,
            Pageable pageable);
}
