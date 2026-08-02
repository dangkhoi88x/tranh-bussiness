package com.example.businessstore.dto.response;

import com.example.businessstore.entity.User;

import java.util.List;
import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String email,
        String firstName,
        String lastName,
        List<String> roles,
        String accessToken) {

    public static AuthResponse from(User user, String accessToken) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                List.copyOf(user.getRoleNames()),
                accessToken);
    }
}
