package com.example.businessstore.dto.response;

import com.example.businessstore.entity.User;

import java.util.List;
import java.util.UUID;

public record UserResponse(UUID id, String email, String firstName, String lastName, String phone, List<String> roles) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhone(),
                List.copyOf(user.getRoleNames()));
    }
}
