package com.example.businessstore.controller;

import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.UpdateProfileRequest;
import com.example.businessstore.dto.request.UpdateManagedUserEnabledRequest;
import com.example.businessstore.dto.request.UpdateManagedUserRolesRequest;
import com.example.businessstore.dto.request.UpdateRolePermissionsRequest;
import com.example.businessstore.dto.response.ManagedRoleResponse;
import com.example.businessstore.dto.response.ManagedUserResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.service.AuthenticationService;
import com.example.businessstore.service.UserManagementService;
import jakarta.validation.Valid;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class CurrentUserController {

    private final AuthenticationService authenticationService;
    private final UserManagementService userManagementService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> currentUser(@AuthenticationPrincipal Jwt jwt) {
        UserResponse user = authenticationService.currentUser(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        UserResponse user = authenticationService.updateProfile(UUID.fromString(jwt.getSubject()), request);
        return ResponseEntity.ok(ApiResponse.success(user, "Đã cập nhật hồ sơ."));
    }

    @GetMapping
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_USERS)
    public ResponseEntity<ApiResponse<PageResponse<ManagedUserResponse>>> users(
            @RequestParam(defaultValue = "") String query,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.getUsers(query, page, size)));
    }

    @GetMapping("/roles")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_USERS)
    public ResponseEntity<ApiResponse<java.util.List<ManagedRoleResponse>>> roles() {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.getRoles()));
    }

    @PutMapping("/{userId}/roles")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_USERS)
    public ResponseEntity<ApiResponse<ManagedUserResponse>> updateRoles(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId,
            @Valid @RequestBody UpdateManagedUserRolesRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.updateRoles(UUID.fromString(jwt.getSubject()), userId, request), "Đã cập nhật vai trò người dùng."));
    }

    @PatchMapping("/{userId}/enabled")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_USERS)
    public ResponseEntity<ApiResponse<ManagedUserResponse>> updateEnabled(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID userId,
            @RequestBody UpdateManagedUserEnabledRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.updateEnabled(UUID.fromString(jwt.getSubject()), userId, request), "Đã cập nhật trạng thái tài khoản."));
    }

    @PutMapping("/roles/STAFF/permissions")
    @PreAuthorize(SecurityExpressions.CAN_MANAGE_USERS)
    public ResponseEntity<ApiResponse<ManagedRoleResponse>> updateStaffPermissions(
            @Valid @RequestBody UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userManagementService.updateStaffPermissions(request), "Đã cập nhật quyền của nhân viên."));
    }
}
