package com.example.businessstore.dto.request;

import com.example.businessstore.constant.RoleName;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record UpdateManagedUserRolesRequest(@NotEmpty Set<RoleName> roles) {
}
