package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PhotobookTemplateRepository extends JpaRepository<PhotobookTemplate, UUID> {

    Optional<PhotobookTemplate> findByDefaultTemplateTrue();
}
