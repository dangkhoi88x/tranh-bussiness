package com.example.businessstore.service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface TokenStore {

    void storeRefreshToken(String tokenId, UUID userId, Instant expiresAt);

    Optional<UUID> consumeRefreshToken(String tokenId);

    void revokeRefreshToken(String tokenId);

    void revokeAllRefreshTokens(UUID userId);

    void blacklistAccessToken(String tokenId, Instant expiresAt);

    boolean isAccessTokenBlacklisted(String tokenId);

    void storePasswordResetToken(String tokenHash, UUID userId, Instant expiresAt);

    Optional<UUID> consumePasswordResetToken(String tokenHash);
}
