package com.example.businessstore.service;

import com.example.businessstore.dto.response.PhotobookArrangementResponse;

import java.util.UUID;

/**
 * Storyboard của một cuốn: sắp xếp ảnh vào spread, đổi archetype từng spread. Đây là bản nháp
 * cho xưởng hoàn thiện, chỉ sửa được trong khoảng khách đã chốt ảnh nhưng xưởng chưa gửi bản mềm.
 */
public interface PhotobookArrangementService {

    PhotobookArrangementResponse getArrangement(UUID userId, UUID projectId);

    PhotobookArrangementResponse changeSpreadLayout(UUID userId, UUID projectId, UUID spreadId, String layoutCode);

    /** photoId null nghĩa là dọn trống ô; nếu ảnh đang ở ô khác thì hai ô hoán vị cho nhau. */
    PhotobookArrangementResponse assignPhoto(UUID userId, UUID projectId, UUID slotId, UUID photoId);
}
