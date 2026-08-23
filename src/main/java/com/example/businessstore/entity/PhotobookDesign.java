package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;

/**
 * Bản thiết kế photobook khách hoàn tất trước khi mua (layout từng spread, ảnh, crop, caption,
 * màu nền) — snapshot vĩnh viễn để cart/order item chốt vào, khác với {@link PhotobookDraft}
 * (bản nháp có thể sửa tiếp tục, ghi đè mỗi lần autosave) và {@link PhotobookSharePreview}
 * (có hạn dùng, dùng để chia sẻ công khai).
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_designs")
@NoArgsConstructor
public class PhotobookDesign extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "product_slug", nullable = false)
    private String productSlug;

    @Column(name = "size_label", length = 100)
    private String sizeLabel;

    @Column(name = "page_count", nullable = false)
    private int pageCount;

    @Column(length = 50)
    private String finish;

    @Column(name = "template_id", length = 50)
    private String templateId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spreads_json", nullable = false, columnDefinition = "jsonb")
    private String spreadsJson;

    @OneToMany(mappedBy = "design", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<PhotobookDesignImage> images = new ArrayList<>();
}
