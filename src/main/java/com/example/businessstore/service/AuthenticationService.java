package com.example.businessstore.service;

import com.example.businessstore.dto.request.LoginRequest;
import com.example.businessstore.dto.request.GoogleOAuthCodeRequest;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.dto.response.UserResponse;

import java.util.UUID;

public interface AuthenticationService {

    AuthSession register(RegisterRequest request);

    AuthSession login(LoginRequest request);

    AuthSession loginWithGoogle(GoogleOAuthCodeRequest request);

    AuthSession refresh(String rawToken);

    void logout(String accessToken, String refreshToken);

    UserResponse currentUser(UUID userId);
}
