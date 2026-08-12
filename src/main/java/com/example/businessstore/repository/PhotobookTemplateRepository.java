package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PhotobookTemplateRepository extends JpaRepository<PhotobookTemplate, UUID> {

    Optional<PhotobookTemplate> findByDefaultTemplateTrue();

    /** Không lọc theo active: cuốn đã đặt theo một chủ đề sau đó bị ẩn vẫn phải dựng được. */
    Optional<PhotobookTemplate> findByCode(String code);

    Optional<PhotobookTemplate> findByCodeAndActiveTrue(String code);

    List<PhotobookTemplate> findAllByActiveTrueOrderBySortOrderAscNameAsc();

    List<PhotobookTemplate> findAllByOrderBySortOrderAscNameAsc();

    boolean existsByCode(String code);

    List<PhotobookTemplate> findAllByDefaultTemplateTrue();

    List<PhotobookTemplate> findAllByDefaultTemplateTrueAndIdNot(UUID id);
}
