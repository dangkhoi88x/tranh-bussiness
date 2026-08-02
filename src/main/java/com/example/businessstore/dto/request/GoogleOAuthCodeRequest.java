package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotBlank;

public record GoogleOAuthCodeRequest(
        @NotBlank String code,
        @NotBlank String redirectUri) {
}
