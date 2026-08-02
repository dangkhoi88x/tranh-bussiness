package com.example.businessstore.security;

import lombok.RequiredArgsConstructor;
import com.example.businessstore.service.TokenStore;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AccessTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID_TOKEN = new OAuth2Error("invalid_token");

    private final JwtProperties jwtProperties;
    private final TokenStore tokenStore;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        boolean validIssuer = jwtProperties.issuer().equals(token.getClaimAsString("iss"));
        boolean validAudience = token.getAudience().contains(jwtProperties.audience());
        boolean isAccessToken = "access".equals(token.getClaimAsString("token_type"));
        boolean isBlacklisted = token.getId() != null && tokenStore.isAccessTokenBlacklisted(token.getId());

        return validIssuer && validAudience && isAccessToken && !isBlacklisted
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
    }
}
