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

/**
 * Giá neo của một khổ photobook tại một mức số trang cụ thể — ví dụ khổ S ở 20 trang.
 * Bảng giá của xưởng không suy ra được bằng một công thức duy nhất (khổ S có giá riêng
 * ở cả hai mức), nên từng mức niêm yết được lưu thành dữ liệu; phụ thu mỗi bậc chỉ dùng
 * cho các mức trang nằm trên neo cao nhất.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_page_tiers")
@NoArgsConstructor
public class PhotobookPageTier extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @Column(name = "page_count", nullable = false)
    private int pageCount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal price;
}
