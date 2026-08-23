package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Size;

/** Ghi chú kèm bộ ảnh: thứ tự mong muốn, ảnh nào lên bìa, dịp gì… */
public record SubmitPhotobookPhotosRequest(@Size(max = 2000) String customerNote) {
}
