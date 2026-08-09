package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một archetype bố cục spread (vd. "Tràn đôi", "Contact sheet") — dữ liệu tham chiếu dùng
 * chung cho mọi cuốn, không thuộc riêng project nào.
 *
 * <p>{@code slots} là JSON thô (mảng {@code {x,y,w,h,bleed}}, toạ độ 0..1 tính theo % của cả
 * spread) lưu dưới dạng TEXT — không cần Postgres truy vấn theo khoá JSON nên tránh luôn rủi ro
 * khớp kiểu cột jsonb với Hibernate; xem {@link com.example.businessstore.service.impl.PhotobookLayoutEngine}.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_layouts")
@NoArgsConstructor
public class PhotobookLayout extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String slots;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private boolean active;
}
