package com.example.businessstore.repository;

import com.example.businessstore.entity.PaymentRefund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRefundRepository extends JpaRepository<PaymentRefund, UUID> {

    Optional<PaymentRefund> findByOrderId(UUID orderId);

    boolean existsByPaymentId(UUID paymentId);
}
