package com.example.businessstore.repository;

import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.entity.PhotobookProject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookProjectRepository extends JpaRepository<PhotobookProject, UUID> {

    Optional<PhotobookProject> findByIdAndUserId(UUID id, UUID userId);

    Page<PhotobookProject> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    List<PhotobookProject> findAllByOrderIdIn(Collection<UUID> orderIds);

    Page<PhotobookProject> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<PhotobookProject> findAllByStatusOrderByCreatedAtDesc(PhotobookProjectStatus status, Pageable pageable);
}
