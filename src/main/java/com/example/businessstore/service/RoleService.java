package com.example.businessstore.service;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Role;

public interface RoleService {

    Role createRole(RoleName roleName);
}
