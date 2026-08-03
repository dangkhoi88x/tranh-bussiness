package com.example.businessstore.service;

import com.example.businessstore.dto.request.UpdateManagedUserEnabledRequest;
import com.example.businessstore.dto.request.UpdateManagedUserRolesRequest;
import com.example.businessstore.dto.request.UpdateRolePermissionsRequest;
import com.example.businessstore.dto.response.ManagedRoleResponse;
import com.example.businessstore.dto.response.ManagedUserResponse;
import com.example.businessstore.dto.response.PageResponse;

import java.util.List;
import java.util.UUID;

public interface UserManagementService {
    PageResponse<ManagedUserResponse> getUsers(String query, int page, int size);
    ManagedUserResponse updateRoles(UUID actorId, UUID userId, UpdateManagedUserRolesRequest request);
    ManagedUserResponse updateEnabled(UUID actorId, UUID userId, UpdateManagedUserEnabledRequest request);
    List<ManagedRoleResponse> getRoles();
    ManagedRoleResponse updateStaffPermissions(UpdateRolePermissionsRequest request);
}
