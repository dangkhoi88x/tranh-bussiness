package com.example.businessstore.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.cookie")
public record SecurityCookieProperties(boolean secure) {
}
