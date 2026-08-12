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

@Getter
@Setter
@Entity
@Table(name = "cart_items")
@NoArgsConstructor
public class CartItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id")
    private ProductVariant productVariant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_frame_option_id")
    private ProductFrameOption productFrameOption;

    /** Số trang khách chọn với photobook; null với sản phẩm không bán theo trang. */
    @Column(name = "page_count")
    private Integer pageCount;

    /** Bản thiết kế photobook đã chốt trước khi thêm vào giỏ; null nếu khách bỏ qua bước thiết kế. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photobook_design_id")
    private PhotobookDesign photobookDesign;

    @Column(nullable = false)
    private int quantity;
}
