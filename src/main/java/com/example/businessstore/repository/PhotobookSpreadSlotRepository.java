package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookSpreadSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookSpreadSlotRepository extends JpaRepository<PhotobookSpreadSlot, UUID> {

    /** Ô đang chứa một ảnh cho trước, nếu có — dùng để tìm chỗ cũ của ảnh trước khi hoán vị. */
    Optional<PhotobookSpreadSlot> findByPhotobookSpreadPhotobookProjectIdAndPhotoId(
            UUID photobookProjectId, UUID photoId);

    /** Toàn bộ ảnh đang được đặt vào ô nào đó trong project — phần bù là ảnh còn "chưa xếp". */
    List<PhotobookSpreadSlot> findAllByPhotobookSpreadPhotobookProjectIdAndPhotoIsNotNull(UUID photobookProjectId);

    /** Sở hữu được kiểm ngay trong câu truy vấn, giống PhotobookSpreadRepository. */
    Optional<PhotobookSpreadSlot> findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
            UUID id, UUID photobookProjectId, UUID userId);
}
