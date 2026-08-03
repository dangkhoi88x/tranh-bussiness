package com.example.businessstore.service.impl;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.User;
import com.example.businessstore.event.UserRegisteredEvent;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
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
}
