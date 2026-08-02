package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "order_shipping_addresses") @NoArgsConstructor
public class OrderShippingAddress extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false, unique = true) private Order order;
    @Column(name = "recipient_name", nullable = false, length = 160) private String recipientName;
    @Column(nullable = false, length = 30) private String phone;
    @Column(nullable = false, length = 120) private String province;
    @Column(nullable = false, length = 120) private String district;
    @Column(nullable = false, length = 120) private String ward;
    @Column(name = "address_line", nullable = false, length = 255) private String addressLine;
}
