package com.example.businessstore.dto.request;

import com.example.businessstore.constant.MaterialStatus;
import jakarta.validation.constraints.Size;

public record UpdateMaterialRequest(
        @Size(min = 1, max = 50) String code,
        @Size(min = 1, max = 100) String name,
        MaterialStatus status,
        @Size(max = 2000) String description) {
}
