package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookSpread;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookSpreadRepository extends JpaRepository<PhotobookSpread, UUID> {

    List<PhotobookSpread> findAllByPhotobookProjectIdOrderByPositionAsc(UUID photobookProjectId);

    boolean existsByPhotobookProjectId(UUID photobookProjectId);

    /** Sở hữu được kiểm ngay trong câu truy vấn: chỉ khớp nếu spread thuộc project của đúng khách. */
    Optional<PhotobookSpread> findByIdAndPhotobookProjectIdAndPhotobookProjectUserId(
            UUID id, UUID photobookProjectId, UUID userId);
}
