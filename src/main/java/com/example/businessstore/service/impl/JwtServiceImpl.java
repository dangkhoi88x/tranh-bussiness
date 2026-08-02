package com.example.businessstore.service.impl;

import com.example.businessstore.entity.User;
import com.example.businessstore.security.JwtProperties;
import com.example.businessstore.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class JwtServiceImpl implements JwtService {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;
    private final JwtDecoder jwtDecoder;
    @Qualifier("refreshTokenDecoder")
    private final JwtDecoder refreshTokenDecoder;

    public String createAccessToken(User user) {
        return createToken(user, "access", jwtProperties.accessTokenTtl(), true);
    }

    @Override
    public String createRefreshToken(User user) {
        return createToken(user, "refresh", jwtProperties.refreshTokenTtl(), false);
    }

    @Override
    public Jwt decodeAccessToken(String rawToken) {
        return jwtDecoder.decode(rawToken);
    }

    @Override
    public Jwt decodeRefreshToken(String rawToken) {
        return refreshTokenDecoder.decode(rawToken);
    }

    private String createToken(User user, String tokenType, java.time.Duration ttl, boolean includeRoles) {
        Instant now = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .id(UUID.randomUUID().toString())
                .issuer(jwtProperties.issuer())
                .subject(user.getId().toString())
                .audience(List.of(jwtProperties.audience()))
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("token_type", tokenType);
        if (includeRoles) {
            claims.claim("roles", user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .toList());
        }

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
    }
}
