package com.example.businessstore.service.impl;

import com.example.businessstore.service.TokenStore;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RedisTokenStore implements TokenStore {

    private static final String REFRESH_PREFIX = "iam:refresh:";
    private static final String REFRESH_BY_USER_PREFIX = "iam:refresh-by-user:";
    private static final String ACCESS_BLACKLIST_PREFIX = "iam:access-blacklist:";
    private static final String PASSWORD_RESET_PREFIX = "iam:password-reset:";

    private final StringRedisTemplate redisTemplate;

    @Override
    public void storeRefreshToken(String tokenId, UUID userId, Instant expiresAt) {
        Duration ttl = ttlUntil(expiresAt);
        if (ttl.isZero() || ttl.isNegative()) {
            return;
        }
        redisTemplate.opsForValue().set(refreshKey(tokenId), userId.toString(), ttl);
        redisTemplate.opsForSet().add(refreshByUserKey(userId), tokenId);
        redisTemplate.expire(refreshByUserKey(userId), ttl);
    }

    @Override
    public Optional<UUID> consumeRefreshToken(String tokenId) {
        String userId = redisTemplate.opsForValue().getAndDelete(refreshKey(tokenId));
        if (userId == null) {
            return Optional.empty();
        }
        UUID parsedUserId = UUID.fromString(userId);
        redisTemplate.opsForSet().remove(refreshByUserKey(parsedUserId), tokenId);
        return Optional.of(parsedUserId);
    }

    @Override
    public void revokeRefreshToken(String tokenId) {
        redisTemplate.delete(refreshKey(tokenId));
    }

    @Override
    public void revokeAllRefreshTokens(UUID userId) {
        String userKey = refreshByUserKey(userId);
        var tokenIds = redisTemplate.opsForSet().members(userKey);
        if (tokenIds != null && !tokenIds.isEmpty()) {
            redisTemplate.delete(tokenIds.stream().map(this::refreshKey).toList());
        }
        redisTemplate.delete(userKey);
    }

    @Override
    public void blacklistAccessToken(String tokenId, Instant expiresAt) {
        Duration ttl = ttlUntil(expiresAt);
        if (!ttl.isZero() && !ttl.isNegative()) {
            redisTemplate.opsForValue().set(accessBlacklistKey(tokenId), "1", ttl);
        }
    }

    @Override
    public boolean isAccessTokenBlacklisted(String tokenId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(accessBlacklistKey(tokenId)));
    }

    @Override
    public void storePasswordResetToken(String tokenHash, UUID userId, Instant expiresAt) {
        Duration ttl = ttlUntil(expiresAt);
        if (!ttl.isZero() && !ttl.isNegative()) {
            redisTemplate.opsForValue().set(passwordResetKey(tokenHash), userId.toString(), ttl);
        }
    }

    @Override
    public Optional<UUID> consumePasswordResetToken(String tokenHash) {
        String userId = redisTemplate.opsForValue().getAndDelete(passwordResetKey(tokenHash));
        return userId == null ? Optional.empty() : Optional.of(UUID.fromString(userId));
    }

    private Duration ttlUntil(Instant expiresAt) {
        return Duration.between(Instant.now(), expiresAt);
    }

    private String refreshKey(String tokenId) {
        return REFRESH_PREFIX + tokenId;
    }

    private String refreshByUserKey(UUID userId) {
        return REFRESH_BY_USER_PREFIX + userId;
    }

    private String accessBlacklistKey(String tokenId) {
        return ACCESS_BLACKLIST_PREFIX + tokenId;
    }

    private String passwordResetKey(String tokenHash) {
        return PASSWORD_RESET_PREFIX + tokenHash;
    }
}
