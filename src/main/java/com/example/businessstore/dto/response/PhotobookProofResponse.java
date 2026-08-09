package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PhotobookProofDecision;

import java.time.Instant;
import java.util.UUID;

public record PhotobookProofResponse(
        UUID id,
        int revision,
        /** URL đã ký của cả file (PDF gốc hoặc ảnh) — hết hạn, đừng lưu lại. */
        String url,
        /** Số spread trong bản này. */
        int pageCount,
        /** URL từng spread đã render sẵn thành ảnh, theo đúng thứ tự lật. */
        java.util.List<String> pageUrls,
        String staffNote,
        PhotobookProofDecision decision,
        String customerNote,
        Instant decidedAt,
        Instant createdAt) {
}
