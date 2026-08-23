package com.example.businessstore.dto.response;

import com.example.businessstore.constant.PhotobookProjectStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PhotobookProjectResponse(
        UUID id,
        UUID orderId,
        String orderCode,
        UUID orderItemId,
        String productName,
        String productSlug,
        String variantName,
        int pageCount,
        PhotobookProjectStatus status,
        /** Khoảng ảnh nên gửi cho số trang này — backend là nguồn duy nhất của quy tắc 3–4 ảnh/trang. */
        int recommendedPhotosMin,
        int recommendedPhotosMax,
        int photoCount,
        /** Trần cứng để một cuốn không nuốt hết dung lượng lưu trữ. */
        int maxPhotos,
        boolean editable,
        String customerNote,
        Instant submittedAt,
        /** Số lần khách đã yêu cầu sửa, và trần miễn phí theo chính sách xưởng. */
        int revisionCount,
        int maxRevisions,
        boolean awaitingDecision,
        List<PhotobookPhotoResponse> photos,
        List<PhotobookProofResponse> proofs,
        Instant createdAt) {

    public record PhotobookPhotoResponse(UUID id, String url, String originalFilename, Instant createdAt) {
    }
}
