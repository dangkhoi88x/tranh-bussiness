package com.example.businessstore.repository;

import com.example.businessstore.entity.Permission;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {

    boolean existsByRoleAndPermission(Role role, Permission permission);

    @Modifying
    @Query("delete from RolePermission assignment where assignment.role = :role")
    void deleteByRole(@Param("role") Role role);
}
