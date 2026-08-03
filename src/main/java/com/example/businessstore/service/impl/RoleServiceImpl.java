package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PermissionName;
import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Permission;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.RolePermission;
import com.example.businessstore.repository.PermissionRepository;
import com.example.businessstore.repository.RolePermissionRepository;
import com.example.businessstore.repository.RoleRepository;
import com.example.businessstore.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Override
    @Transactional
    public Role createRole(RoleName roleName) {
        Role role = roleRepository.findByNameIgnoreCase(roleName.name()).orElse(null);
        if (role == null) {
                    Role newRole = new Role();
                    newRole.setName(roleName.name());
                    role = roleRepository.save(newRole);
        }
        if (!role.isPermissionsCustomized()) {
            Role roleToConfigure = role;
            defaultPermissions(roleName).forEach(permissionName -> assignPermission(roleToConfigure, permissionName));
        }
        return role;
    }

    private List<PermissionName> defaultPermissions(RoleName roleName) {
        return switch (roleName) {
            case CUSTOMER -> List.of();
            case STAFF -> List.of(
                    PermissionName.CATEGORY_MANAGE,
                    PermissionName.PRODUCT_MANAGE,
                    PermissionName.FRAME_MANAGE,
                    PermissionName.PROMOTION_MANAGE);
            case ADMIN -> List.of(PermissionName.values());
        };
    }

    private void assignPermission(Role role, PermissionName permissionName) {
        Permission permission = permissionRepository.findByNameIgnoreCase(permissionName.name())
                .orElseGet(() -> {
                    Permission newPermission = new Permission();
                    newPermission.setName(permissionName.name());
                    return permissionRepository.save(newPermission);
                });
        if (rolePermissionRepository.existsByRoleAndPermission(role, permission)) {
            return;
        }

        RolePermission rolePermission = new RolePermission();
        rolePermission.setRole(role);
        rolePermission.setPermission(permission);
        rolePermissionRepository.save(rolePermission);
        role.getRolePermissions().add(rolePermission);
    }
}
