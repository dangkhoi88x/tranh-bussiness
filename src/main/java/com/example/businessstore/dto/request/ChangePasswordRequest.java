package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Giới hạn độ dài trùng với RegisterRequest để mật khẩu đổi về sau không yếu hơn lúc đăng ký. */
public record ChangePasswordRequest(
        @NotBlank String currentPassword,
        @NotBlank @Size(min = 12, max = 72) String newPassword) {
}
