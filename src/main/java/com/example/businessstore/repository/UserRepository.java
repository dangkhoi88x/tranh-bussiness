package com.example.businessstore.repository;

import com.example.businessstore.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

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
    Optional<User> findByGoogleSubject(String googleSubject);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role",
            "userRoles.role.rolePermissions",
            "userRoles.role.rolePermissions.permission"
    })
    @Query("select u from User u where u.id = :id")
    Optional<User> findWithRolesById(@Param("id") UUID id);

    @EntityGraph(attributePaths = {
            "userRoles",
            "userRoles.role",
            "userRoles.role.rolePermissions",
            "userRoles.role.rolePermissions.permission"
    })
    @Query("""
            select u from User u
            where :query = ''
               or lower(u.email) like lower(concat('%', :query, '%'))
               or lower(u.firstName) like lower(concat('%', :query, '%'))
               or lower(u.lastName) like lower(concat('%', :query, '%'))
            """)
    Page<User> searchForManagement(@Param("query") String query, Pageable pageable);

    @Query("""
            select count(u) from User u join u.userRoles ur join ur.role r
            where r.name = 'ADMIN' and u.enabled = true and u.id <> :excludedUserId
            """)
    long countOtherEnabledAdmins(@Param("excludedUserId") UUID excludedUserId);
}
