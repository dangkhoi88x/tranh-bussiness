package com.example.businessstore.configuration;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.core.annotation.Order;

@Component
@Order(0)
@RequiredArgsConstructor
public class RbacInitializer implements ApplicationRunner {

    private final RoleService roleService;

    @Override
    public void run(ApplicationArguments args) {
        for (RoleName roleName : RoleName.values()) {
            roleService.createRole(roleName);
        }
    }
}
