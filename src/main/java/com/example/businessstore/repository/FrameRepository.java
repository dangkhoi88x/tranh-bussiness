package com.example.businessstore.repository;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.entity.Frame;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FrameRepository extends JpaRepository<Frame, UUID> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, UUID id);

    List<Frame> findAllByStatusOrderByNameAsc(FrameStatus status);

    List<Frame> findAllByOrderByNameAsc();

    Optional<Frame> findBySlugAndStatus(String slug, FrameStatus status);
}
