package com.example.businessstore.repository;

import com.example.businessstore.constant.MaterialScope;
import com.example.businessstore.constant.MaterialStatus;
import com.example.businessstore.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
    Optional<Material> findByIdAndScopeAndStatus(UUID id, MaterialScope scope, MaterialStatus status);
    List<Material> findAllByScopeOrderByNameAsc(MaterialScope scope);
    List<Material> findAllByScopeAndStatusOrderByNameAsc(MaterialScope scope, MaterialStatus status);
}
