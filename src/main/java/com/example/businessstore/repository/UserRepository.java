package com.example.businessstore.repository;

import com.example.businessstore.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role",
            "userRoles.role.rolePermissions",
            "userRoles.role.rolePermissions.permission"
    })
    Optional<User> findByEmail(String email);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role",
            "userRoles.role.rolePermissions",
            "userRoles.role.rolePermissions.permission"
    })
    @Query("select u from User u where u.id = :id")
    Optional<User> findWithRolesById(@Param("id") UUID id);
}
