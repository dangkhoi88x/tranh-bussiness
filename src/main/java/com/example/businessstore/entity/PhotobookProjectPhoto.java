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

/**
 * Một ảnh gốc khách gửi. Ảnh riêng tư của khách nên lưu authenticated trên Cloudinary và chỉ
 * phát URL đã ký khi đọc — vì thế ở đây chỉ giữ publicId, không giữ URL tĩnh.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_project_photos")
@NoArgsConstructor
public class PhotobookProjectPhoto extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photobook_project_id", nullable = false)
    private PhotobookProject photobookProject;

    @Column(name = "public_id", nullable = false, unique = true, length = 255)
    private String publicId;

    @Column(name = "original_filename", length = 255)
    private String originalFilename;
}
