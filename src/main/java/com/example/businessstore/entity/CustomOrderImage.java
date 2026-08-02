package com.example.businessstore.entity;
import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Getter @Setter @Entity @Table(name = "custom_order_images") @NoArgsConstructor
public class CustomOrderImage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "custom_order_request_id", nullable = false) private CustomOrderRequest customOrderRequest;
    @Column(name = "public_id", nullable = false, unique = true, length = 255) private String publicId;
    @Column(name = "secure_url", columnDefinition = "TEXT") private String secureUrl;
    @Column(name = "is_authenticated", nullable = false) private boolean authenticated;
}
