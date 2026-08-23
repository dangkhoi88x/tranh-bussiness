package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookDraft;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PhotobookDraftRepository extends JpaRepository<PhotobookDraft, UUID> {

    Optional<PhotobookDraft> findByUserIdAndProductSlug(UUID userId, String productSlug);

    void deleteByUserIdAndProductSlug(UUID userId, String productSlug);
}
