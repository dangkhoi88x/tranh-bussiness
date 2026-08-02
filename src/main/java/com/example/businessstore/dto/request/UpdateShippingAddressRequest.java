package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*;
public record UpdateShippingAddressRequest(@NotBlank @Size(max = 160) String recipientName, @NotBlank @Pattern(regexp = "^[0-9+() .-]{8,30}$") String phone, @NotBlank @Size(max = 120) String province, @NotBlank @Size(max = 120) String district, @NotBlank @Size(max = 120) String ward, @NotBlank @Size(max = 255) String addressLine, Boolean defaultAddress) {}
