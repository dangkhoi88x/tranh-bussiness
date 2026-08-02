package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter @Setter @Entity @Table(name = "order_items") @NoArgsConstructor
public class OrderItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    @Column(name = "product_id", nullable = false) private java.util.UUID productId;
    @Column(name = "product_name", nullable = false, length = 180) private String productName;
    @Column(name = "product_slug", nullable = false, length = 220) private String productSlug;
    @Column(name = "product_variant_id") private java.util.UUID productVariantId;
    @Column(name = "variant_sku", length = 80) private String variantSku;
    @Column(name = "variant_name", length = 180) private String variantName;
    @Column(name = "variant_material", length = 100) private String variantMaterial;
    @Column(name = "variant_width_cm", precision = 10, scale = 2) private BigDecimal variantWidthCm;
    @Column(name = "variant_height_cm", precision = 10, scale = 2) private BigDecimal variantHeightCm;
    @Column(name = "product_frame_option_id") private java.util.UUID productFrameOptionId;
    @Column(name = "frame_name", length = 120) private String frameName;
    @Column(name = "product_price", nullable = false, precision = 19, scale = 2) private BigDecimal productPrice;
    @Column(name = "frame_price_adjustment", nullable = false, precision = 19, scale = 2) private BigDecimal framePriceAdjustment;
    @Column(name = "unit_price", nullable = false, precision = 19, scale = 2) private BigDecimal unitPrice;
    @Column(nullable = false) private int quantity;
    @Column(name = "line_total", nullable = false, precision = 19, scale = 2) private BigDecimal lineTotal;
}
