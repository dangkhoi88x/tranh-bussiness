package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookDesign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PhotobookDesignRepository extends JpaRepository<PhotobookDesign, UUID> {

    Optional<PhotobookDesign> findByIdAndUserId(UUID id, UUID userId);
}
