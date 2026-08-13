package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Email cố ý không nằm ở đây: đó là danh tính đăng nhập, đổi nó phải đi kèm bước xác minh
 * địa chỉ mới, nếu không người dùng có thể tự khoá mình ra khỏi tài khoản bằng một lỗi gõ.
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Size(max = 30) String phone) {
}
