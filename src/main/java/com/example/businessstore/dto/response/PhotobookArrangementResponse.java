package com.example.businessstore.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Bản sắp xếp storyboard của một cuốn: toàn bộ spread kèm ảnh đã đặt, thư viện archetype để
 * khách đổi layout từng spread, và những ảnh chưa được xếp vào ô nào (khách gửi dư).
 *
 * <p>Đây là bản nháp cho xưởng hoàn thiện — không phải file in cuối cùng.
 */
public record PhotobookArrangementResponse(
        UUID projectId,
        /** Chỉ true khi status == PHOTOS_SUBMITTED; các bước sau bản sắp xếp đã bàn giao cho xưởng. */
        boolean editable,
        List<PhotobookLayoutResponse> layouts,
        List<PhotobookSpreadResponse> spreads,
        List<PhotobookProjectResponse.PhotobookPhotoResponse> unplacedPhotos) {
}
