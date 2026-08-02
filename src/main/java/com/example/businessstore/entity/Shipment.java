package com.example.businessstore.entity;
import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.ShipmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.Instant;
@Getter @Setter @Entity @Table(name = "shipments") @NoArgsConstructor
public class Shipment extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false, unique = true) private Order order;
    @Column(nullable = false, length = 120) private String carrier;
    @Column(name = "tracking_code", nullable = false, unique = true, length = 120) private String trackingCode;
    @Column(name = "shipping_fee", nullable = false, precision = 19, scale = 2) private BigDecimal shippingFee;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ShipmentStatus status;
    @Column(name = "shipped_at") private Instant shippedAt;
    @Column(name = "delivered_at") private Instant deliveredAt;
    @Column(name = "failed_at") private Instant failedAt;
    @Column(name = "failure_reason", columnDefinition = "TEXT") private String failureReason;
}
