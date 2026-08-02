package com.example.businessstore.repository;

import com.example.businessstore.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByNameIgnoreCase(String name);
}
