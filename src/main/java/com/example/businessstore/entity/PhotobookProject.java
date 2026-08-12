package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.PhotobookProjectStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Một cuốn photobook đã đặt, kèm bộ ảnh khách gửi. Mỗi dòng đơn hàng photobook có đúng một
 * project — một đơn nhiều cuốn thì mỗi cuốn giữ tập ảnh riêng.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_projects")
@NoArgsConstructor
public class PhotobookProject extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false, unique = true)
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Chụp lại từ dòng đơn: số ảnh cần gửi tính theo số trang đã chốt lúc đặt. */
    @Column(name = "page_count", nullable = false)
    private int pageCount;

    /**
     * Mẫu khách chọn lúc mua ({@link PhotobookTemplate#getCode()}), chụp lại từ dòng đơn. Null
     * với cuốn đặt trước khi có tính năng chọn mẫu — khi đó engine lùi về mẫu mặc định.
     */
    @Column(name = "template_code", length = 40)
    private String templateCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PhotobookProjectStatus status;

    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    /** Số lần khách đã yêu cầu sửa; xưởng miễn phí 2 lần theo chính sách công bố. */
    @Column(name = "revision_count", nullable = false)
    private int revisionCount;

    @OneToMany(mappedBy = "photobookProject", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<PhotobookProjectPhoto> photos = new ArrayList<>();

    @OneToMany(mappedBy = "photobookProject", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("revision ASC")
    private List<PhotobookProof> proofs = new ArrayList<>();
}
