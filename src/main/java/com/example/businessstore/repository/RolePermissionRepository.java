package com.example.businessstore.repository;

import com.example.businessstore.entity.Permission;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    boolean existsByRoleAndPermission(Role role, Permission permission);
}
