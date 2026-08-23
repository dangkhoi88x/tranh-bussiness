package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.ChangePasswordRequest;
import com.example.businessstore.dto.request.UpdateProfileRequest;
import com.example.businessstore.dto.response.UserResponse;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.AuthSession;
import com.example.businessstore.service.GoogleOAuthService;
import com.example.businessstore.service.JwtService;
import com.example.businessstore.service.RefreshTokenService;
import com.example.businessstore.service.RoleService;
import com.example.businessstore.service.TokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccountSelfServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private TokenStore tokenStore;
    @Mock private GoogleOAuthService googleOAuthService;
    @Mock private RoleService roleService;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private AuthenticationServiceImpl authenticationService;

    private final UUID userId = UUID.randomUUID();
    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(userId);
        user.setEmail("khach@tranh.vn");
        user.setFirstName("An");
        user.setLastName("Nguyen");
        user.setPhone("0900000000");
        user.setPasswordHash("hash-cua-mat-khau-cu");
        when(userRepository.findWithRolesById(userId)).thenReturn(Optional.of(user));
    }

    @Test
    void updatesTheProfileAndTrimsWhitespace() {
        UserResponse response = authenticationService.updateProfile(userId,
                new UpdateProfileRequest("  Bình  ", " Trần ", " 0912345678 "));

        assertThat(user.getFirstName()).isEqualTo("Bình");
        assertThat(user.getLastName()).isEqualTo("Trần");
        assertThat(user.getPhone()).isEqualTo("0912345678");
        assertThat(response.firstName()).isEqualTo("Bình");
    }

    @Test
    void treatsABlankPhoneAsNoPhone() {
        authenticationService.updateProfile(userId, new UpdateProfileRequest("An", "Nguyen", "   "));

        assertThat(user.getPhone()).isNull();
    }

    @Test
    void neverChangesTheLoginEmail() {
        authenticationService.updateProfile(userId, new UpdateProfileRequest("An", "Nguyen", null));

        assertThat(user.getEmail()).isEqualTo("khach@tranh.vn");
    }

    @Test
    void changesThePasswordAndIssuesAFreshSession() {
        when(passwordEncoder.matches("mat-khau-cu-1234", "hash-cua-mat-khau-cu")).thenReturn(true);
        when(passwordEncoder.matches("mat-khau-moi-1234", "hash-cua-mat-khau-cu")).thenReturn(false);
        when(passwordEncoder.encode("mat-khau-moi-1234")).thenReturn("hash-cua-mat-khau-moi");
        when(jwtService.createAccessToken(user)).thenReturn("access-token-moi");
        when(refreshTokenService.create(user)).thenReturn("refresh-token-moi");

        AuthSession session = authenticationService.changePassword(userId,
                new ChangePasswordRequest("mat-khau-cu-1234", "mat-khau-moi-1234"));

        assertThat(user.getPasswordHash()).isEqualTo("hash-cua-mat-khau-moi");
        assertThat(session.refreshToken()).isEqualTo("refresh-token-moi");
        assertThat(session.response().accessToken()).isEqualTo("access-token-moi");
    }

    @Test
    void revokesEveryOldSessionBeforeMintingTheNewOne() {
        when(passwordEncoder.matches("mat-khau-cu-1234", "hash-cua-mat-khau-cu")).thenReturn(true);
        when(passwordEncoder.matches("mat-khau-moi-1234", "hash-cua-mat-khau-cu")).thenReturn(false);
        when(passwordEncoder.encode("mat-khau-moi-1234")).thenReturn("hash-cua-mat-khau-moi");
        when(jwtService.createAccessToken(user)).thenReturn("access-token-moi");
        when(refreshTokenService.create(user)).thenReturn("refresh-token-moi");

        authenticationService.changePassword(userId,
                new ChangePasswordRequest("mat-khau-cu-1234", "mat-khau-moi-1234"));

        // Đảo thứ tự là refresh token vừa cấp cũng bị xoá theo, người dùng đổi mật khẩu
        // xong sẽ bị đá ra ngay ở lần refresh kế tiếp.
        InOrder order = inOrder(tokenStore, refreshTokenService);
        order.verify(tokenStore).revokeAllRefreshTokens(userId);
        order.verify(refreshTokenService).create(user);
    }

    @Test
    void rejectsAWrongCurrentPassword() {
        when(passwordEncoder.matches("sai-mat-khau-roi", "hash-cua-mat-khau-cu")).thenReturn(false);

        assertThatThrownBy(() -> authenticationService.changePassword(userId,
                new ChangePasswordRequest("sai-mat-khau-roi", "mat-khau-moi-1234")))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_CREDENTIALS);

        assertThat(user.getPasswordHash()).isEqualTo("hash-cua-mat-khau-cu");
        verify(tokenStore, never()).revokeAllRefreshTokens(any());
    }

    @Test
    void rejectsReusingTheSamePassword() {
        when(passwordEncoder.matches("mat-khau-cu-1234", "hash-cua-mat-khau-cu")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.changePassword(userId,
                new ChangePasswordRequest("mat-khau-cu-1234", "mat-khau-cu-1234")))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_REQUEST);

        verify(tokenStore, never()).revokeAllRefreshTokens(any());
    }
}
