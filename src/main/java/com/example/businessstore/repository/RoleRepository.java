package com.example.businessstore.repository;

import com.example.businessstore.entity.Role;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByNameIgnoreCase(String name);

    @EntityGraph(attributePaths = {"rolePermissions", "rolePermissions.permission"})
    Optional<Role> findWithPermissionsByNameIgnoreCase(String name);

    @EntityGraph(attributePaths = {"rolePermissions", "rolePermissions.permission"})
    java.util.List<Role> findAllByOrderByNameAsc();
}
