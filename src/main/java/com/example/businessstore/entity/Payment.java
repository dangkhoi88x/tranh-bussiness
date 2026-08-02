package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.PaymentMethod;
import com.example.businessstore.constant.PaymentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;

@Getter @Setter @Entity @Table(name = "payments") @NoArgsConstructor
public class Payment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentMethod method;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentStatus status;
    @Column(name = "transaction_code", nullable = false, unique = true, updatable = false, length = 64) private String transactionCode;
    @Column(name = "paid_at") private Instant paidAt;
}
