package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.FrameStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "frames")
@NoArgsConstructor
public class Frame extends BaseEntity {

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, unique = true, length = 160)
    private String slug;

    @Column(nullable = false, length = 80)
    private String material;

    @Column(nullable = false, length = 80)
    private String color;

    @Column(name = "width_mm", nullable = false, precision = 10, scale = 2)
    private BigDecimal widthMm;

    @Column(name = "price_adjustment", nullable = false, precision = 19, scale = 2)
    private BigDecimal priceAdjustment;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_public_id", length = 255)
    private String imagePublicId;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FrameStatus status;
}
