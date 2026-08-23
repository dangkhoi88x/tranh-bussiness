package com.example.businessstore.service;

import com.example.businessstore.dto.request.ChangePasswordRequest;
import com.example.businessstore.dto.request.LoginRequest;
import com.example.businessstore.dto.request.GoogleOAuthCodeRequest;
import com.example.businessstore.dto.request.RegisterRequest;
import com.example.businessstore.dto.request.UpdateProfileRequest;
import com.example.businessstore.dto.response.UserResponse;

import java.util.UUID;

public interface AuthenticationService {

    AuthSession register(RegisterRequest request);

    AuthSession login(LoginRequest request);

    AuthSession loginWithGoogle(GoogleOAuthCodeRequest request);

    AuthSession refresh(String rawToken);

    void logout(String accessToken, String refreshToken);

    UserResponse currentUser(UUID userId);

    UserResponse updateProfile(UUID userId, UpdateProfileRequest request);

    /**
     * Trả về phiên mới cho chính thiết bị vừa đổi mật khẩu: mọi refresh token cũ đã bị thu
     * hồi, nên nếu không cấp lại thì người dùng sẽ bị đá ra ngay sau khi đổi thành công.
     */
    AuthSession changePassword(UUID userId, ChangePasswordRequest request);
}
