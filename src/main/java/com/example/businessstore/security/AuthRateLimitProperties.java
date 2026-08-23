package com.example.businessstore.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Hạn mức cho các endpoint xác thực công khai. Cố ý không giới hạn /auth/refresh và
 * /auth/logout: ứng dụng gọi refresh đều đặn theo vòng đời access token, chặn nó là tự
 * đăng xuất người dùng thật.
 */
@ConfigurationProperties(prefix = "app.security.auth-rate-limit")
public record AuthRateLimitProperties(
        boolean enabled,
        Rule login,
        Rule register,
        Rule passwordForgot,
        Rule passwordReset) {

    public record Rule(int limit, Duration window) {
    }
}
