package com.example.businessstore.controller;

import com.example.businessstore.dto.request.LoginRequest;
import com.example.businessstore.dto.request.GoogleOAuthCodeRequest;
import com.example.businessstore.dto.request.ForgotPasswordRequest;
import com.example.businessstore.dto.request.ResetPasswordRequest;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.dto.response.AuthResponse;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.service.AuthSession;
import com.example.businessstore.service.AuthenticationService;
import com.example.businessstore.service.PasswordResetService;
import com.example.businessstore.security.JwtProperties;
import com.example.businessstore.security.SecurityCookieProperties;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final AuthenticationService authenticationService;
    private final JwtProperties jwtProperties;
    private final SecurityCookieProperties cookieProperties;
    private final PasswordResetService passwordResetService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthSession session = authenticationService.register(request);
        return withRefreshCookie(HttpStatus.CREATED, session, "Registration completed");
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthSession session = authenticationService.login(request);
        return withRefreshCookie(HttpStatus.OK, session, "Login completed");
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> loginWithGoogle(@Valid @RequestBody GoogleOAuthCodeRequest request) {
        AuthSession session = authenticationService.loginWithGoogle(request);
        return withRefreshCookie(HttpStatus.OK, session, "Google login completed");
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        AuthSession session = authenticationService.refresh(refreshToken);
        return withRefreshCookie(HttpStatus.OK, session, "Access token refreshed");
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorizationHeader,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String refreshToken) {
        authenticationService.logout(extractBearerToken(authorizationHeader), refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie("", 0).toString())
                .build();
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok(ApiResponse.success(null, "If the email exists, a password reset link has been sent"));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset completed"));
    }

    private ResponseEntity<ApiResponse<AuthResponse>> withRefreshCookie(
            HttpStatus status,
            AuthSession session,
            String message) {
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, refreshCookie(session.refreshToken(), jwtProperties.refreshTokenTtl().toSeconds()).toString())
                .body(ApiResponse.success(session.response(), message));
    }

    private ResponseCookie refreshCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(REFRESH_COOKIE_NAME, value)
                .httpOnly(true)
                .secure(cookieProperties.secure())
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(maxAgeSeconds)
                .build();
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        return authorizationHeader.substring("Bearer ".length()).trim();
    }
}
