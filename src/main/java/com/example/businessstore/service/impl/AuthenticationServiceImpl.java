package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.AuthResponse;
import com.example.businessstore.dto.request.ChangePasswordRequest;
import com.example.businessstore.dto.request.LoginRequest;
import com.example.businessstore.dto.request.GoogleOAuthCodeRequest;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.dto.request.UpdateProfileRequest;
import com.example.businessstore.dto.response.UserResponse;
import com.example.businessstore.entity.User;
import com.example.businessstore.constant.RoleName;
import com.example.businessstore.event.UserRegisteredEvent;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.service.AuthSession;
import com.example.businessstore.service.AuthenticationService;
import com.example.businessstore.service.JwtService;
import com.example.businessstore.service.RefreshTokenService;
import com.example.businessstore.service.RoleService;
import com.example.businessstore.service.GoogleOAuthService;
import com.example.businessstore.service.TokenStore;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements AuthenticationService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final TokenStore tokenStore;
    private final GoogleOAuthService googleOAuthService;
    private final RoleService roleService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public AuthSession register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.EMAIL_ALREADY_EXISTS, "Email này đã có người dùng.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setPhone(normalizeOptional(request.phone()));
        user.addRole(roleService.createRole(RoleName.CUSTOMER));
        userRepository.save(user);
        publishUserRegistered(user);
        return issueSession(user);
    }

    @Transactional
    public AuthSession login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(normalizeEmail(request.email()), request.password()));
            return issueSession((User) authentication.getPrincipal());
        } catch (AuthenticationException exception) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Email hoặc mật khẩu không đúng.");
        }
    }

    @Transactional
    public AuthSession loginWithGoogle(GoogleOAuthCodeRequest request) {
        GoogleOAuthService.GoogleProfile profile = googleOAuthService.authenticate(request.code(), request.redirectUri());
        User linkedGoogleUser = userRepository.findByGoogleSubject(profile.subject()).orElse(null);
        if (linkedGoogleUser != null) {
            return issueSession(linkedGoogleUser);
        }

        String email = normalizeEmail(profile.email());
        if (userRepository.existsByEmail(email)) {
            throw new AppException(ErrorCode.ACCOUNT_LINK_REQUIRED,
                    "Email này đã được đăng ký bằng mật khẩu. Vui lòng đăng nhập bằng mật khẩu hoặc đặt lại mật khẩu.");
        }

        User user = createGoogleUser(profile);
        publishUserRegistered(user);
        return issueSession(user);
    }

    @Transactional
    public AuthSession refresh(String rawToken) {
        User user = refreshTokenService.rotate(rawToken);
        return issueSession(user);
    }

    @Transactional
    public void logout(String accessToken, String refreshToken) {
        refreshTokenService.revoke(refreshToken);
        if (accessToken == null || accessToken.isBlank()) {
            return;
        }
        try {
            Jwt accessJwt = jwtService.decodeAccessToken(accessToken);
            tokenStore.blacklistAccessToken(accessJwt.getId(), accessJwt.getExpiresAt());
        } catch (JwtException exception) {
            // Logout still clears the browser cookie even if the access token already expired.
        }
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(UUID userId) {
        User user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng."));
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng."));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        String phone = request.phone() == null ? "" : request.phone().trim();
        user.setPhone(phone.isEmpty() ? null : phone);
        return UserResponse.from(user);
    }

    @Transactional
    public AuthSession changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy người dùng."));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Mật khẩu hiện tại không đúng.");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        // Thu hồi trước rồi mới cấp phiên mới, nếu không refresh token vừa tạo cũng bị xoá
        // theo. Access token của thiết bị khác vẫn sống tới khi hết hạn (mặc định 15 phút).
        tokenStore.revokeAllRefreshTokens(userId);
        return issueSession(user);
    }

    private AuthSession issueSession(User user) {
        if (!user.isEnabled()) {
            throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Tài khoản đã bị khoá.");
        }
        String accessToken = jwtService.createAccessToken(user);
        String refreshToken = refreshTokenService.create(user);
        return new AuthSession(AuthResponse.from(user, accessToken), refreshToken);
    }

    private User createGoogleUser(GoogleOAuthService.GoogleProfile profile) {
        User user = new User();
        user.setEmail(normalizeEmail(profile.email()));
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setFirstName(normalizeName(profile.givenName(), "Google"));
        user.setLastName(normalizeName(profile.familyName(), "User"));
        user.setGoogleSubject(profile.subject());
        user.addRole(roleService.createRole(RoleName.CUSTOMER));
        return userRepository.save(user);
    }

    private void publishUserRegistered(User user) {
        eventPublisher.publishEvent(new UserRegisteredEvent(user.getId(), user.getEmail(), user.getFirstName()));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeName(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
