package com.example.businessstore.service.impl;

import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.security.GoogleOAuthProperties;
import com.example.businessstore.service.GoogleOAuthService;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleOAuthServiceImpl implements GoogleOAuthService {

    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";

    private final GoogleOAuthProperties googleOAuthProperties;

    @Override
    public GoogleProfile authenticate(String authorizationCode, String redirectUri) {
        if (!googleOAuthProperties.isConfigured()) {
            throw new AppException(ErrorCode.GOOGLE_OAUTH_NOT_CONFIGURED, "Đăng nhập bằng Google chưa được cấu hình.");
        }
        try {
            GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                    new NetHttpTransport(),
                    GsonFactory.getDefaultInstance(),
                    TOKEN_URL,
                    googleOAuthProperties.clientId(),
                    googleOAuthProperties.clientSecret(),
                    authorizationCode.trim(),
                    redirectUri.trim())
                    .execute();
            GoogleIdToken idToken = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(List.of(googleOAuthProperties.clientId()))
                    .build()
                    .verify(tokenResponse.getIdToken());
            if (idToken == null || !Boolean.TRUE.equals(idToken.getPayload().getEmailVerified())) {
                throw new AppException(ErrorCode.INVALID_GOOGLE_ID_TOKEN, "Email của tài khoản Google này chưa được xác minh.");
            }
            GoogleIdToken.Payload profile = idToken.getPayload();
            return new GoogleProfile(profile.getSubject(), profile.getEmail(),
                    (String) profile.get("given_name"), (String) profile.get("family_name"));
        } catch (GeneralSecurityException exception) {
            log.warn("Google ID token validation failed", exception);
            throw new AppException(ErrorCode.INVALID_GOOGLE_ID_TOKEN, "Thông tin xác thực từ Google không hợp lệ.");
        } catch (IOException exception) {
            log.warn("Google authorization code exchange failed", exception);
            throw new AppException(ErrorCode.GOOGLE_AUTHENTICATION_FAILED, "Không hoàn tất được đăng nhập bằng Google.");
        }
    }
}
