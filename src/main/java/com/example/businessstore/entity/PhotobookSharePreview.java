package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "photobook_share_previews")
@NoArgsConstructor
public class PhotobookSharePreview extends BaseEntity {

    @Column(nullable = false, unique = true, length = 16)
    private String token;

    @Column(name = "product_slug", nullable = false)
    private String productSlug;

    @Column(name = "size_label", length = 100)
    private String sizeLabel;

    @Column(name = "page_count", length = 20)
    private String pageCount;

    @Column(length = 50)
    private String finish;

    @Column(name = "template_id", length = 50)
    private String templateId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spreads_json", nullable = false, columnDefinition = "jsonb")
    private String spreadsJson;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @OneToMany(mappedBy = "preview", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<PhotobookSharePreviewImage> images = new ArrayList<>();
}
