package com.example.businessstore.entity;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

class UserRbacTest {

    @Test
    void authoritiesContainAllRolesAndPermissionsWithoutDuplicates() {
        User user = new User();

        Role staff = role("STAFF", "PRODUCT_MANAGE", "FRAME_MANAGE");
        Role admin = role("ADMIN", "PRODUCT_MANAGE", "USER_MANAGE");
        user.addRole(staff);
        user.addRole(admin);

        Collection<String> authorities = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        assertThat(user.getRoleNames()).containsExactly("STAFF", "ADMIN");
        assertThat(authorities).containsExactly(
                "ROLE_STAFF",
                "PRODUCT_MANAGE",
                "FRAME_MANAGE",
                "ROLE_ADMIN",
                "USER_MANAGE");
    }

    @Test
    void addRoleIgnoresAnAlreadyAssignedRoleName() {
        User user = new User();

        user.addRole(role("CUSTOMER"));
        user.addRole(role("customer"));

        assertThat(user.getUserRoles()).hasSize(1);
        assertThat(user.getRoleNames()).containsExactly("CUSTOMER");
    }

    private Role role(String name, String... permissionNames) {
        Role role = new Role();
        role.setName(name);
        for (String permissionName : permissionNames) {
            Permission permission = new Permission();
            permission.setName(permissionName);

            RolePermission rolePermission = new RolePermission();
            rolePermission.setRole(role);
            rolePermission.setPermission(permission);
            role.getRolePermissions().add(rolePermission);
        }
        return role;
    }
}
