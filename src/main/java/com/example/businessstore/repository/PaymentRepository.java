package com.example.businessstore.repository;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
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
}
