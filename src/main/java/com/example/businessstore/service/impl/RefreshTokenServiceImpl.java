package com.example.businessstore.service.impl;

import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.JwtService;
import com.example.businessstore.service.RefreshTokenService;
import com.example.businessstore.service.TokenStore;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final JwtService jwtService;
    private final TokenStore tokenStore;
    private final UserRepository userRepository;

    @Transactional
    public String create(User user) {
        String rawToken = jwtService.createRefreshToken(user);
        Jwt refreshToken = jwtService.decodeRefreshToken(rawToken);
        tokenStore.storeRefreshToken(refreshToken.getId(), user.getId(), refreshToken.getExpiresAt());
        return rawToken;
    }

    @Transactional
    public User rotate(String rawToken) {
        Jwt refreshToken = decode(rawToken);
        UUID userId = tokenStore.consumeRefreshToken(refreshToken.getId())
                .filter(expectedUserId -> expectedUserId.equals(UUID.fromString(refreshToken.getSubject())))
                .orElseThrow(() -> invalidToken("Refresh token is missing, expired, or already used"));
        return userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REFRESH_TOKEN, "Người dùng này không còn tồn tại."));
    }

    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        try {
            tokenStore.revokeRefreshToken(jwtService.decodeRefreshToken(rawToken).getId());
        } catch (JwtException exception) {
            // Clearing an invalid browser cookie must still allow logout to complete.
        }
    }

    private Jwt decode(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalidToken("Refresh token is missing or invalid");
        }
        try {
            return jwtService.decodeRefreshToken(rawToken);
        } catch (JwtException exception) {
            throw invalidToken("Refresh token is missing or invalid");
        }
    }

    private AppException invalidToken(String message) {
        return new AppException(ErrorCode.INVALID_REFRESH_TOKEN, message);
    }
}
