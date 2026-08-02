package com.example.businessstore.entity;
import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name = "product_variants") @NoArgsConstructor
public class ProductVariant extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id", nullable = false) private Product product;
    @Column(nullable = false, unique = true, length = 80) private String sku;
    @Column(nullable = false, length = 180) private String name;
    @Column(name = "width_cm", nullable = false, precision = 10, scale = 2) private BigDecimal widthCm;
    @Column(name = "height_cm", nullable = false, precision = 10, scale = 2) private BigDecimal heightCm;
    @Column(nullable = false, length = 100) private String material;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal price;
    @Column(name = "stock_quantity", nullable = false) private int stockQuantity;
    @Column(nullable = false) private boolean available;
}
