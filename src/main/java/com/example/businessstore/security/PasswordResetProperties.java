package com.example.businessstore.security;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "app.security.password-reset")
public record PasswordResetProperties(@NotNull Duration ttl) {
}
