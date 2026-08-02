package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.CustomOrderRequestType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @Entity @Table(name = "order_custom_details") @NoArgsConstructor
public class OrderCustomDetails extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;
    @Column(name = "custom_order_request_id", nullable = false, unique = true)
    private UUID customOrderRequestId;
    @Column(name = "request_code", nullable = false, length = 32)
    private String requestCode;
    @Enumerated(EnumType.STRING) @Column(name = "request_type", nullable = false, length = 30)
    private CustomOrderRequestType requestType;
    @Column(name = "width_cm", nullable = false, precision = 10, scale = 2)
    private BigDecimal widthCm;
    @Column(name = "height_cm", nullable = false, precision = 10, scale = 2)
    private BigDecimal heightCm;
    @Column(nullable = false, length = 100)
    private String material;
    @Column(name = "frame_id")
    private UUID frameId;
    @Column(name = "frame_name", length = 120)
    private String frameName;
    @Column(name = "quoted_price", nullable = false, precision = 19, scale = 2)
    private BigDecimal quotedPrice;
}
