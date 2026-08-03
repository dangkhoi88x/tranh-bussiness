package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PermissionName;
import com.example.businessstore.constant.RoleName;
import com.example.businessstore.dto.request.UpdateManagedUserEnabledRequest;
import com.example.businessstore.dto.request.UpdateManagedUserRolesRequest;
import com.example.businessstore.dto.request.UpdateRolePermissionsRequest;
import com.example.businessstore.dto.response.ManagedRoleResponse;
import com.example.businessstore.dto.response.ManagedUserResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.entity.Permission;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.RolePermission;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PermissionRepository;
import com.example.businessstore.repository.RolePermissionRepository;
import com.example.businessstore.repository.RoleRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.TokenStore;
import com.example.businessstore.service.UserManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserManagementServiceImpl implements UserManagementService {
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<PermissionName> STAFF_ASSIGNABLE_PERMISSIONS = EnumSet.complementOf(EnumSet.of(PermissionName.USER_MANAGE));

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final TokenStore tokenStore;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<ManagedUserResponse> getUsers(String query, int page, int size) {
        int normalizedPage = Math.max(page, 1);
        Page<User> users = userRepository.searchForManagement(normalizeQuery(query), PageRequest.of(normalizedPage - 1,
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")));
        return new PageResponse<>(users.getContent().stream().map(ManagedUserResponse::from).toList(), normalizedPage,
                users.getSize(), users.getTotalElements(), users.getTotalPages(), users.hasNext());
    }

    @Override
    @Transactional
    public ManagedUserResponse updateRoles(UUID actorId, UUID userId, UpdateManagedUserRolesRequest request) {
        rejectSelfManagement(actorId, userId);
        User user = getUser(userId);
        if (hasAdminRole(user) && !request.roles().contains(RoleName.ADMIN) && user.isEnabled() && userRepository.countOtherEnabledAdmins(userId) == 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot remove the last enabled administrator role");
        }
        Map<String, Role> rolesByName = roleRepository.findAllByOrderByNameAsc().stream()
                .collect(Collectors.toMap(Role::getName, Function.identity()));
        if (request.roles().stream().anyMatch(role -> !rolesByName.containsKey(role.name()))) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "One or more roles do not exist");
        }
        user.getUserRoles().removeIf(assignment -> !request.roles().contains(RoleName.valueOf(assignment.getRole().getName())));
        request.roles().forEach(role -> {
            if (!user.getRoleNames().contains(role.name())) {
                user.addRole(rolesByName.get(role.name()));
            }
        });
        tokenStore.revokeAllRefreshTokens(userId);
        return ManagedUserResponse.from(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public ManagedUserResponse updateEnabled(UUID actorId, UUID userId, UpdateManagedUserEnabledRequest request) {
        rejectSelfManagement(actorId, userId);
        User user = getUser(userId);
        if (!request.enabled() && hasAdminRole(user) && userRepository.countOtherEnabledAdmins(userId) == 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Cannot disable the last enabled administrator");
        }
        user.setEnabled(request.enabled());
        tokenStore.revokeAllRefreshTokens(userId);
        return ManagedUserResponse.from(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagedRoleResponse> getRoles() {
        return roleRepository.findAllByOrderByNameAsc().stream().map(ManagedRoleResponse::from).toList();
    }

    @Override
    @Transactional
    public ManagedRoleResponse updateStaffPermissions(UpdateRolePermissionsRequest request) {
        if (!STAFF_ASSIGNABLE_PERMISSIONS.containsAll(request.permissions())) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "USER_MANAGE can only belong to ADMIN");
        }
        Role staff = roleRepository.findWithPermissionsByNameIgnoreCase(RoleName.STAFF.name())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "STAFF role not found"));
        Map<String, Permission> permissionsByName = permissionRepository.findAll().stream()
                .collect(Collectors.toMap(Permission::getName, Function.identity()));
        if (request.permissions().stream().anyMatch(permission -> !permissionsByName.containsKey(permission.name()))) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "One or more permissions do not exist");
        }
        rolePermissionRepository.deleteByRole(staff);
        rolePermissionRepository.flush();
        staff.getRolePermissions().clear();
        request.permissions().forEach(permissionName -> {
            RolePermission assignment = new RolePermission();
            assignment.setRole(staff);
            assignment.setPermission(permissionsByName.get(permissionName.name()));
            staff.getRolePermissions().add(assignment);
        });
        staff.setPermissionsCustomized(true);
        return ManagedRoleResponse.from(roleRepository.saveAndFlush(staff));
    }

    private User getUser(UUID userId) {
        return userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "User not found"));
    }

    private boolean hasAdminRole(User user) {
        return user.getRoleNames().contains(RoleName.ADMIN.name());
    }

    private void rejectSelfManagement(UUID actorId, UUID userId) {
        if (actorId.equals(userId)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "You cannot change your own roles or account status");
        }
    }

    private String normalizeQuery(String query) {
        return query == null ? "" : query.trim();
    }
}
