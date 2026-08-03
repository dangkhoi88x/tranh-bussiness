package com.example.businessstore.dto.response;

import com.example.businessstore.entity.User;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record ManagedUserResponse(UUID id, String email, String firstName, String lastName, String phone,
                                  boolean enabled, List<String> roles, Instant createdAt) {
    public static ManagedUserResponse from(User user) {
        return new ManagedUserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.getPhone(),
                user.isEnabled(), user.getRoleNames().stream().sorted(Comparator.naturalOrder()).toList(), user.getCreatedAt());
    }
}
