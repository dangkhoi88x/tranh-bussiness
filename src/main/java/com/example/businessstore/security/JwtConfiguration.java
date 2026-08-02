package com.example.businessstore.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

@Configuration
public class JwtConfiguration {

    @Bean
    JwtEncoder jwtEncoder(JwtProperties jwtProperties) {
        return NimbusJwtEncoder.withSecretKey(signingKey(jwtProperties))
                .algorithm(MacAlgorithm.HS256)
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(JwtProperties jwtProperties, AccessTokenValidator accessTokenValidator) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(signingKey(jwtProperties))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        OAuth2TokenValidator<Jwt> validators = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                accessTokenValidator);
        decoder.setJwtValidator(validators);
        return decoder;
    }

    @Bean(name = "refreshTokenDecoder")
    JwtDecoder refreshTokenDecoder(JwtProperties jwtProperties, RefreshTokenValidator refreshTokenValidator) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(signingKey(jwtProperties))
                .macAlgorithm(MacAlgorithm.HS256)
                .build();
        OAuth2TokenValidator<Jwt> validators = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                refreshTokenValidator);
        decoder.setJwtValidator(validators);
        return decoder;
    }

    private SecretKey signingKey(JwtProperties jwtProperties) {
        byte[] key = Base64.getDecoder().decode(jwtProperties.secret());
        if (key.length < 32) {
            throw new IllegalStateException("JWT_SECRET must decode to at least 32 bytes");
        }
        return new SecretKeySpec(key, "HmacSHA256");
    }
}
