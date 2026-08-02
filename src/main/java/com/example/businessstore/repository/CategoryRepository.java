package com.example.businessstore.repository;

import com.example.businessstore.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, UUID id);

    boolean existsBySlug(String slug);

    Optional<Category> findBySlug(String slug);

    List<Category> findAllByOrderByNameAsc();

    boolean existsById(UUID id);
}
