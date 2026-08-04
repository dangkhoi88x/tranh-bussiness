package com.example.businessstore.dto.request;

import com.example.businessstore.constant.MaterialScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateMaterialRequest(
        @NotBlank @Size(max = 50) String code,
        @NotBlank @Size(max = 100) String name,
        @NotNull MaterialScope scope,
        @Size(max = 2000) String description) {
}
