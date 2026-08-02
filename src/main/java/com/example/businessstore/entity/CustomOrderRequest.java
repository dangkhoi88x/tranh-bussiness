package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.CustomOrderRequestStatus;
import com.example.businessstore.constant.CustomOrderRequestType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter @Setter @Entity @Table(name = "custom_order_requests") @NoArgsConstructor
public class CustomOrderRequest extends BaseEntity {
    @Column(name = "request_code", nullable = false, unique = true, updatable = false, length = 32) private String requestCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private CustomOrderRequestType type;
    @Column(name = "width_cm", nullable = false, precision = 10, scale = 2) private BigDecimal widthCm;
    @Column(name = "height_cm", nullable = false, precision = 10, scale = 2) private BigDecimal heightCm;
    @Column(nullable = false, length = 100) private String material;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "frame_id") private Frame selectedFrame;
    @Column(name = "quoted_price", precision = 19, scale = 2) private BigDecimal quotedPrice;
    @Column(name = "staff_note", columnDefinition = "TEXT") private String staffNote;
    @Column(name = "customer_note", columnDefinition = "TEXT") private String customerNote;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id", unique = true) private Order order;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private CustomOrderRequestStatus status;
    @OneToMany(mappedBy = "customOrderRequest", cascade = CascadeType.ALL, orphanRemoval = true) private List<CustomOrderImage> images = new ArrayList<>();
}
