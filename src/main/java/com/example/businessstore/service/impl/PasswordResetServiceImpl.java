package com.example.businessstore.service.impl;

import com.example.businessstore.configuration.ApplicationProperties;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.security.PasswordResetProperties;
import com.example.businessstore.service.MailService;
import com.example.businessstore.service.PasswordResetService;
import com.example.businessstore.service.TokenStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final TokenStore tokenStore;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetProperties passwordResetProperties;
    private final ApplicationProperties applicationProperties;
    private final MailService mailService;

    @Override
    public void requestReset(String email) {
        userRepository.findByEmail(email.trim().toLowerCase(Locale.ROOT)).ifPresent(user -> {
            String rawToken = newToken();
            Instant expiresAt = Instant.now().plus(passwordResetProperties.ttl());
            tokenStore.storePasswordResetToken(hash(rawToken), user.getId(), expiresAt);
            String resetUrl = UriComponentsBuilder.fromUriString(applicationProperties.frontendUrl())
                    .path("/dat-lai-mat-khau")
                    .queryParam("token", rawToken)
                    .build()
                    .toUriString();
            try {
                mailService.sendPasswordResetEmail(user.getEmail(), resetUrl);
            } catch (RuntimeException mailFailure) {
                // Endpoint phải trả lời y hệt nhau dù email có tài khoản hay không. Để lỗi
                // thoát ra ngoài là tự tố cáo đúng những địa chỉ đã đăng ký, vì email không
                // tồn tại thì không bao giờ gửi thư nên không bao giờ lỗi. Việc gửi đã chạy
                // nền, nên ở đây chỉ còn bắt trường hợp hàng đợi mail đầy.
                log.warn("Could not queue the password reset email; the request still reports success", mailFailure);
            }
        });
    }

    @Override
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        UUID userId = tokenStore.consumePasswordResetToken(hash(rawToken))
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_PASSWORD_RESET_TOKEN, "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_PASSWORD_RESET_TOKEN, "Liên kết đặt lại mật khẩu không hợp lệ."));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        tokenStore.revokeAllRefreshTokens(userId);
    }

    private String newToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
