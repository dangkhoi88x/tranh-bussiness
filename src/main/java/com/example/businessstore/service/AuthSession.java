package com.example.businessstore.service;

import com.example.businessstore.dto.response.AuthResponse;

public record AuthSession(AuthResponse response, String refreshToken) {
}
