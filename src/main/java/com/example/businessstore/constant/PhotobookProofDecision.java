package com.example.businessstore.constant;

public enum PhotobookProofDecision {

    /** Đã gửi khách, đang chờ quyết định. */
    PENDING,

    /** Khách duyệt — cuốn sách chuyển sang in. */
    APPROVED,

    /** Khách yêu cầu sửa; xưởng làm lại và gửi bản mới. */
    REVISION_REQUESTED
}
