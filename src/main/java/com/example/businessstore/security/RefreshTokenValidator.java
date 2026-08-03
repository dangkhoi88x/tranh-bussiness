package com.example.businessstore.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshTokenValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error INVALID_TOKEN = new OAuth2Error("invalid_token");

    private final JwtProperties jwtProperties;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        // getIssuer() converts the claim to URL in Spring Security 7. Our issuer is an
        // application identifier (for example "tranh-store-api"), so compare the raw
        // registered claim just like the access-token validator does.
        boolean validIssuer = jwtProperties.issuer().equals(token.getClaimAsString("iss"));
        boolean validAudience = token.getAudience().contains(jwtProperties.audience());
        boolean isRefreshToken = "refresh".equals(token.getClaimAsString("token_type"));

        return validIssuer && validAudience && isRefreshToken
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
    }
}
