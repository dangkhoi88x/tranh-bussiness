package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Trình tự archetype mặc định cho một cuốn — {@code layoutCodes} là mảng JSON các mã
 * {@link PhotobookLayout#getCode()} (TEXT, cùng lý do như PhotobookLayout), lặp lại theo chu kỳ
 * nếu số spread của cuốn nhiều hơn độ dài mảng.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_templates")
@NoArgsConstructor
public class PhotobookTemplate extends BaseEntity {

    @Column(nullable = false, unique = true, length = 40)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "layout_codes", nullable = false, columnDefinition = "TEXT")
    private String layoutCodes;

    // Không đặt tên "isDefault": Lombok bỏ tiền tố "is" khi sinh getter/setter cho field boolean
    // đã bắt đầu bằng "is", ra setDefault(...)/isDefault() lẫn lộn khó đoán. Đặt tên khác hẳn.
    @Column(name = "is_default", nullable = false)
    private boolean defaultTemplate;
}
