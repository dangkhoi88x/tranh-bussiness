package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookLayout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookLayoutRepository extends JpaRepository<PhotobookLayout, UUID> {

    List<PhotobookLayout> findAllByActiveTrueOrderBySortOrderAsc();

    Optional<PhotobookLayout> findByCodeAndActiveTrue(String code);
}
