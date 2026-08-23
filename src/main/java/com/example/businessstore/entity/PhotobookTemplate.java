package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Một chủ đề photobook khách chọn được ở trang sản phẩm. Gồm hai phần: phần đi vào sản xuất
 * ({@code layoutCodes} — mảng JSON các mã {@link PhotobookLayout#getCode()}, lặp lại theo chu kỳ
 * nếu cuốn nhiều spread hơn độ dài mảng, PhotobookLayoutEngine dựng theo đây) và phần trình bày
 * mà trình sửa dùng để vẽ bản xem trước ({@code spreadColors}, {@code presetCaptions}, font, màu
 * chữ). Cả hai đều lưu JSON dạng TEXT, cùng lý do như PhotobookLayout.
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

    /** Emoji hiện trên nút chọn chủ đề. */
    @Column(length = 16)
    private String icon;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "default_font", nullable = false, length = 80)
    private String defaultFont;

    @Column(name = "default_caption_color", nullable = false, length = 20)
    private String defaultCaptionColor;

    /** Mảng JSON mã màu nền, xoay vòng theo spread. */
    @Column(name = "spread_colors", nullable = false, columnDefinition = "TEXT")
    private String spreadColors;

    /** Mảng JSON {spreadIndex, text, fontSize, fontFamily, color, align} đặt sẵn khi mở chủ đề. */
    @Column(name = "preset_captions", nullable = false, columnDefinition = "TEXT")
    private String presetCaptions;

    /**
     * Chủ đề ẩn không hiện ra cho khách chọn nữa, nhưng cuốn đã đặt theo nó vẫn dựng được —
     * PhotobookLayoutEngine tra bằng mã, không lọc theo cờ này.
     */
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
