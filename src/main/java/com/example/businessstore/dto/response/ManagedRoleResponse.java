package com.example.businessstore.dto.response;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Role;

import java.util.Comparator;
import java.util.List;

public record ManagedRoleResponse(String name, String description, boolean permissionsConfigurable, List<String> permissions) {
    public static ManagedRoleResponse from(Role role) {
        return new ManagedRoleResponse(role.getName(), role.getDescription(), RoleName.STAFF.name().equals(role.getName()),
                role.getRolePermissions().stream().map(assignment -> assignment.getPermission().getName())
                        .sorted(Comparator.naturalOrder()).toList());
    }
}
