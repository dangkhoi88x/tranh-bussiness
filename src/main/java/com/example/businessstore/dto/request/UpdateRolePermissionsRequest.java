package com.example.businessstore.dto.request;

import com.example.businessstore.constant.PermissionName;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record UpdateRolePermissionsRequest(@NotNull Set<PermissionName> permissions) {
}
