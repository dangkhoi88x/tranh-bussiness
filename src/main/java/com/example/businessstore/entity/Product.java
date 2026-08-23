package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.ProductStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "products")
@NoArgsConstructor
public class Product extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;

    @Column(name = "width_cm", precision = 10, scale = 2)
    private BigDecimal widthCm;

    @Column(name = "height_cm", precision = 10, scale = 2)
    private BigDecimal heightCm;

    @Column(nullable = false)
    private int stockQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProductStatus status;

    @Column(name = "page_count")
    private Integer pageCount;

    @Column(name = "cover_material", length = 120)
    private String coverMaterial;

    /* Trục giá theo số trang — chỉ photobook dùng; sản phẩm khác để trống cả bốn cột.
       Xem V39__add_photobook_page_pricing.sql và PhotobookPricing. */

    @Column(name = "min_pages")
    private Integer minPages;

    @Column(name = "max_pages")
    private Integer maxPages;

    @Column(name = "page_step")
    private Integer pageStep;

    @Column(name = "price_per_step", precision = 19, scale = 2)
    private BigDecimal pricePerStep;

    /** Sản phẩm có bán theo số trang hay không — quyết định pageCount là bắt buộc hay phải bỏ trống. */
    public boolean isPagePriced() {
        return minPages != null && maxPages != null && pageStep != null && pricePerStep != null;
    }
}
