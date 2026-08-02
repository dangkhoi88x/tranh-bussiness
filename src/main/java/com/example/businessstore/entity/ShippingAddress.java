package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "shipping_addresses") @NoArgsConstructor
public class ShippingAddress extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(name = "recipient_name", nullable = false, length = 160) private String recipientName;
    @Column(nullable = false, length = 30) private String phone;
    @Column(nullable = false, length = 120) private String province;
    @Column(nullable = false, length = 120) private String district;
    @Column(nullable = false, length = 120) private String ward;
    @Column(name = "address_line", nullable = false, length = 255) private String addressLine;
    @Column(name = "is_default", nullable = false) private boolean defaultAddress;
}
