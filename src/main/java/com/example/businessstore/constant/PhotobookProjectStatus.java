package com.example.businessstore.constant;

/**
 * Vòng đời một cuốn photobook sau khi đặt, đúng theo quy trình xưởng công bố:
 * khách gửi ảnh → xưởng lên layout → gửi bản mềm duyệt → in.
 *
 */
public enum PhotobookProjectStatus {

    /** Vừa đặt xong, đang chờ khách gửi ảnh. */
    AWAITING_PHOTOS,

    /** Khách đã chốt bộ ảnh; xưởng bắt đầu lên layout. Khách không thêm/xoá ảnh được nữa. */
    PHOTOS_SUBMITTED,

    /** Xưởng đã gửi bản mềm, đang chờ khách duyệt. */
    PROOF_SENT,

    /** Khách yêu cầu sửa; xưởng chỉnh layout rồi gửi bản mới. */
    REVISION_REQUESTED,

    /** Khách duyệt bản mềm, cuốn sách chuyển sang in. */
    APPROVED
}
