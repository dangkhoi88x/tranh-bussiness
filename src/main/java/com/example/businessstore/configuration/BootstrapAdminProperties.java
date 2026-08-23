package com.example.businessstore.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Optional first administrator for environments that never run the development seed.
 * An empty email disables the bootstrap entirely, so a deployment that already has an
 * administrator does not need to keep these variables set.
 */
@ConfigurationProperties(prefix = "app.bootstrap-admin")
public record BootstrapAdminProperties(
        String email,
        String password,
        String firstName,
        String lastName,
        boolean resetPassword) {

    public BootstrapAdminProperties {
        email = email == null ? "" : email.trim().toLowerCase();
        password = password == null ? "" : password;
        firstName = firstName == null || firstName.isBlank() ? "Quản trị viên" : firstName.trim();
        lastName = lastName == null || lastName.isBlank() ? "Tranh Business" : lastName.trim();
    }

    public boolean configured() {
        return !email.isEmpty();
    }
}
