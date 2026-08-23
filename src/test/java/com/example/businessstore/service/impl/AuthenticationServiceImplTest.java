package com.example.businessstore.service.impl;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.dto.request.GoogleOAuthCodeRequest;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.User;
import com.example.businessstore.event.UserRegisteredEvent;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.GoogleOAuthService;
import com.example.businessstore.service.JwtService;
import com.example.businessstore.service.RefreshTokenService;
import com.example.businessstore.service.RoleService;
import com.example.businessstore.service.TokenStore;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceImplTest {

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

    @Test
    void register_publishesWelcomeEventForTheNewAccount() {
        UUID userId = UUID.randomUUID();
        Role customer = new Role(); customer.setName(RoleName.CUSTOMER.name());
        when(userRepository.existsByEmail("artist@example.com")).thenReturn(false);
        when(passwordEncoder.encode("a-secure-password")).thenReturn("password-hash");
        when(roleService.createRole(RoleName.CUSTOMER)).thenReturn(customer);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(userId);
            return user;
        });
        when(jwtService.createAccessToken(any(User.class))).thenReturn("access-token");
        when(refreshTokenService.create(any(User.class))).thenReturn("refresh-token");

        authenticationService.register(new RegisterRequest(
                " Artist@Example.com ", "a-secure-password", "An", "Nguyen", null));

        ArgumentCaptor<UserRegisteredEvent> event = ArgumentCaptor.forClass(UserRegisteredEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue()).isEqualTo(new UserRegisteredEvent(userId, "artist@example.com", "An"));
        verify(roleService).createRole(RoleName.CUSTOMER);
        verify(userRepository).existsByEmail(eq("artist@example.com"));
    }

    @Test
    void loginWithGoogle_usesAccountAlreadyLinkedByGoogleSubject() {
        User linkedUser = user("google@example.com");
        linkedUser.setGoogleSubject("google-subject");
        GoogleOAuthService.GoogleProfile profile =
                new GoogleOAuthService.GoogleProfile("google-subject", "google@example.com", "An", "Nguyen");
        when(googleOAuthService.authenticate("code", "redirect-uri")).thenReturn(profile);
        when(userRepository.findByGoogleSubject("google-subject")).thenReturn(Optional.of(linkedUser));
        when(jwtService.createAccessToken(linkedUser)).thenReturn("access-token");
        when(refreshTokenService.create(linkedUser)).thenReturn("refresh-token");

        authenticationService.loginWithGoogle(new GoogleOAuthCodeRequest("code", "redirect-uri"));

        verify(userRepository, never()).existsByEmail(any());
        verify(userRepository, never()).save(any());
        verify(jwtService).createAccessToken(linkedUser);
    }

    @Test
    void loginWithGoogle_rejectsUnlinkedExistingEmailWithoutIssuingSession() {
        GoogleOAuthService.GoogleProfile profile =
                new GoogleOAuthService.GoogleProfile("victim-google-subject", "Victim@Example.com", "Vi", "Ctim");
        when(googleOAuthService.authenticate("code", "redirect-uri")).thenReturn(profile);
        when(userRepository.findByGoogleSubject("victim-google-subject")).thenReturn(Optional.empty());
        when(userRepository.existsByEmail("victim@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authenticationService.loginWithGoogle(
                new GoogleOAuthCodeRequest("code", "redirect-uri")))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.ACCOUNT_LINK_REQUIRED);

        verify(userRepository, never()).save(any());
        verify(jwtService, never()).createAccessToken(any());
        verify(refreshTokenService, never()).create(any());
    }

    @Test
    void loginWithGoogle_createsGoogleAccountWithStableSubject() {
        Role customer = new Role(); customer.setName(RoleName.CUSTOMER.name());
        GoogleOAuthService.GoogleProfile profile =
                new GoogleOAuthService.GoogleProfile("new-google-subject", " New@Example.com ", "An", "Nguyen");
        when(googleOAuthService.authenticate("code", "redirect-uri")).thenReturn(profile);
        when(userRepository.findByGoogleSubject("new-google-subject")).thenReturn(Optional.empty());
        when(userRepository.existsByEmail("new@example.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("random-password-hash");
        when(roleService.createRole(RoleName.CUSTOMER)).thenReturn(customer);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(jwtService.createAccessToken(any(User.class))).thenReturn("access-token");
        when(refreshTokenService.create(any(User.class))).thenReturn("refresh-token");

        authenticationService.loginWithGoogle(new GoogleOAuthCodeRequest("code", "redirect-uri"));

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getEmail()).isEqualTo("new@example.com");
        assertThat(savedUser.getValue().getGoogleSubject()).isEqualTo("new-google-subject");
    }

    private User user(String email) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setFirstName("An");
        user.setLastName("Nguyen");
        user.setPasswordHash("password-hash");
        return user;
    }
}
