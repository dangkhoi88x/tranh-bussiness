package com.example.businessstore.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenValidatorTest {

    @Test
    void acceptsApplicationIdentifierIssuerWithoutConvertingItToUrl() {
        JwtProperties properties = new JwtProperties(
                "tranh-store-api", "tranh-store-web", "test-secret", Duration.ofMinutes(15), Duration.ofDays(14));
        Jwt refreshToken = new Jwt(
                "token-value",
                Instant.now(),
                Instant.now().plusSeconds(60),
                Map.of("alg", "HS256"),
                Map.of("iss", "tranh-store-api", "aud", List.of("tranh-store-web"), "token_type", "refresh"));

        assertThat(new RefreshTokenValidator(properties).validate(refreshToken).hasErrors()).isFalse();
    }
}
