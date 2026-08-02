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

@Getter
@Setter
@Entity
@Table(name = "product_frame_options")
@NoArgsConstructor
public class ProductFrameOption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "frame_id", nullable = false)
    private Frame frame;

    @Column(name = "price_adjustment", nullable = false, precision = 19, scale = 2)
    private BigDecimal priceAdjustment;

    @Column(nullable = false)
    private boolean available;
}
