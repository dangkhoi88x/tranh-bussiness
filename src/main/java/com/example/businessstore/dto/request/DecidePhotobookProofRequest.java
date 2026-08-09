package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Khách duyệt bản mềm hoặc yêu cầu sửa. Từ chối thì phải nói rõ sửa gì — đó là đầu bài
 * cho bản kế tiếp, nên customerNote bắt buộc ở nhánh accepted = false (kiểm ở service).
 */
public record DecidePhotobookProofRequest(
        @NotNull Boolean approved,
        @Size(max = 2000) String customerNote) {
}
