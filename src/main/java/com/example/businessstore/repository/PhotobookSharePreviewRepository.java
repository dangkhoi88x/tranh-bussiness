package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookSharePreview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookSharePreviewRepository extends JpaRepository<PhotobookSharePreview, UUID> {

    Optional<PhotobookSharePreview> findByToken(String token);

    boolean existsByToken(String token);

    List<PhotobookSharePreview> findAllByExpiresAtBefore(Instant cutoff);
}
