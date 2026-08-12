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
 * Một ô trong spread — {@code slotIndex} khớp vị trí trong mảng slots của
 * {@link PhotobookLayout} đang dùng. Ô có thể trống ({@code photo == null}).
 *
 * <p>Một ảnh chỉ ở đúng một ô tại một thời điểm (ràng buộc unique một phần ở DB), nên gán ảnh
 * đã có chỗ khác vào một ô là hoán vị, không phải sao chép — xem
 * {@code PhotobookArrangementServiceImpl.assignPhoto}.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_spread_slots")
@NoArgsConstructor
public class PhotobookSpreadSlot extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photobook_spread_id", nullable = false)
    private PhotobookSpread photobookSpread;

    @Column(name = "slot_index", nullable = false)
    private int slotIndex;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "photobook_project_photo_id")
    private PhotobookProjectPhoto photo;

    /** Phần ảnh nằm giữa khung khi phải cắt — 0..1, mặc định giữa ảnh. */
    @Column(name = "focal_x", nullable = false, precision = 4, scale = 3)
    private BigDecimal focalX = new BigDecimal("0.500");

    @Column(name = "focal_y", nullable = false, precision = 4, scale = 3)
    private BigDecimal focalY = new BigDecimal("0.500");

    /** Độ phóng khách chọn khi crop — 1.00 (không phóng) đến 3.00. Đi kèm focalX/focalY. */
    @Column(nullable = false, precision = 3, scale = 2)
    private BigDecimal zoom = new BigDecimal("1.00");
}
