package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.PhotobookProofDecision;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Một lần xưởng gửi bản mềm cho khách duyệt. Mỗi lần khách yêu cầu sửa, xưởng gửi bản
 * revision kế tiếp — lịch sử giữ nguyên để hai bên đối chiếu được đã sửa những gì.
 */
@Getter
@Setter
@Entity
@Table(name = "photobook_proofs")
@NoArgsConstructor
public class PhotobookProof extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "photobook_project_id", nullable = false)
    private PhotobookProject photobookProject;

    /** Đánh số từ 1; bản 1 là lần gửi đầu, bản 2 trở đi là sau mỗi lần khách yêu cầu sửa. */
    @Column(nullable = false)
    private int revision;

    @Column(name = "public_id", nullable = false, unique = true, length = 255)
    private String publicId;

    /** Số spread trong bản mềm này — bằng số trang PDF, hoặc 1 nếu xưởng gửi một tấm ảnh. */
    @Column(name = "page_count", nullable = false)
    private int pageCount = 1;

    /** PDF thì trang được render qua transformation; ảnh đơn thì phát thẳng. */
    @Column(name = "source_pdf", nullable = false)
    private boolean sourcePdf;

    @Column(name = "staff_note", columnDefinition = "TEXT")
    private String staffNote;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PhotobookProofDecision decision;

    /** Khách viết gì khi yêu cầu sửa — đây là đầu bài cho bản kế tiếp. */
    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Column(name = "decided_at")
    private Instant decidedAt;
}
