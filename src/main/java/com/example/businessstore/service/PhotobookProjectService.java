package com.example.businessstore.service;

import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PhotobookProjectResponse;
import com.example.businessstore.entity.Order;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface PhotobookProjectService {

    /** Mở project cho mọi dòng photobook của một đơn vừa đặt. Không làm gì nếu đơn không có cuốn nào. */
    void openProjectsFor(Order order);

    PageResponse<PhotobookProjectResponse> getMine(UUID userId, int page, int size);

    PhotobookProjectResponse getMineById(UUID userId, UUID projectId);

    PhotobookProjectResponse addPhoto(UUID userId, UUID projectId, MultipartFile file);

    PhotobookProjectResponse removePhoto(UUID userId, UUID projectId, UUID photoId);

    /** Khách chốt bộ ảnh; sau bước này ảnh bị khoá và xưởng bắt đầu lên layout. */
    PhotobookProjectResponse submit(UUID userId, UUID projectId, String customerNote);

    /** Khách duyệt bản mềm mới nhất, hoặc yêu cầu sửa kèm ghi chú. */
    PhotobookProjectResponse decideProof(UUID userId, UUID projectId, boolean approved, String customerNote);

    /* ── Phía xưởng ── */

    PageResponse<PhotobookProjectResponse> getForManagement(PhotobookProjectStatus status, int page, int size);

    PhotobookProjectResponse getForManagementById(UUID projectId);

    /** Xưởng gửi bản mềm kế tiếp cho khách duyệt. */
    PhotobookProjectResponse uploadProof(UUID projectId, MultipartFile file, String staffNote);
}
