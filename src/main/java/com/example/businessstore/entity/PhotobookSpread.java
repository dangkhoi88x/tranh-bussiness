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
 * Một spread (trang đôi) của một cuốn photobook cụ thể — sinh đúng một lần khi khách chốt bộ
 * ảnh ({@code PhotobookProjectServiceImpl.submit()}), theo chu kỳ archetype của
 * {@link PhotobookTemplate}. Khách có thể đổi archetype của từng spread sau đó, trong lúc bản
 * sắp xếp còn ở trạng thái nháp cho xưởng hoàn thiện.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_spreads")
@NoArgsConstructor
public class PhotobookSpread extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photobook_project_id", nullable = false)
    private PhotobookProject photobookProject;

    /** Đánh số từ 1 theo thứ tự trong sách. */
    @Column(nullable = false)
    private int position;

    /** Mã archetype đang dùng — tham chiếu {@link PhotobookLayout#getCode()}. */
    @Column(name = "layout_code", nullable = false, length = 40)
    private String layoutCode;

    @Column(name = "background_color", nullable = false, length = 20)
    private String backgroundColor = "#ffffff";

    /** Chú thích chữ đè lên spread — mảng JSON {id,text,x,y,fontSize,color,bold,align,fontFamily}. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "captions_json", nullable = false, columnDefinition = "jsonb")
    private String captionsJson = "[]";

    @OneToMany(mappedBy = "photobookSpread", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("slotIndex ASC")
    private List<PhotobookSpreadSlot> slots = new ArrayList<>();
}
